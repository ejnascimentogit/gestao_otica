// Acesso ao Supabase. Converte entre as tabelas (snake_case, reais) e os tipos
// do app (camelCase, centavos). Toda leitura é filtrada pela loja do usuário.
import { sb } from '../lib/supabase'
import { hojeISO, type Centavos } from '../domain/formatos'
import { receitaVazia, type Receita } from '../domain/receita'
import { subtotal, totalOs, type ItemOs } from '../domain/totais'
import type { ParcelaSimulada, MetodoJuros } from '../domain/crediario'
import type {
  Agendamento, Cliente, FormaPagamento, Laboratorio, Loja, OrdemServico, Papel, Parcela, Produto, Usuario, Vendedor,
} from './store'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Linha = Record<string, any>

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v))
const cent = (v: unknown): Centavos => Math.round(Number(v ?? 0) * 100)
const reais = (c: Centavos) => Math.round(c) / 100
const umOuNada = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null)

function falhou(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`${contexto}: ${error.message}`)
}

// ---------- sessão ----------
export async function carregarPerfil(): Promise<{ loja: Loja; nomeUsuario: string; perfilId: string; papel: Papel; trocarSenha: boolean } | null> {
  const { data: u } = await sb.auth.getUser()
  if (!u.user) return null
  const { data, error } = await sb
    .from('perfis')
    .select('id, nome, papel, loja_id, lojas(id, nome, cnpj, telefone, endereco, logo_url, logo_icone_url)')
    .eq('user_id', u.user.id)
    .eq('ativo', true)
    .limit(1)
  falhou(error, 'Carregar perfil')
  const p = data?.[0] as Linha | undefined
  if (!p) return null
  const l = umOuNada(p.lojas) as Linha
  return {
    nomeUsuario: p.nome,
    perfilId: p.id,
    papel: p.papel,
    trocarSenha: u.user.user_metadata?.trocar_senha === true,
    loja: {
      id: l.id, nome: l.nome, cnpj: l.cnpj ?? '', telefone: l.telefone ?? '', endereco: l.endereco?.texto ?? '',
      logoUrl: l.logo_url ?? undefined, logoIconeUrl: l.logo_icone_url ?? undefined,
    },
  }
}

// ---------- mapeamentos ----------
const clienteDeDb = (r: Linha): Cliente => ({
  id: r.id, nome: r.nome, cpf: r.cpf_cnpj ?? '', celular: r.celular ?? '',
  nascimento: r.nascimento ?? undefined, endereco: r.endereco?.texto ?? undefined,
})

const produtoDeDb = (r: Linha): Produto => ({
  id: r.id, tipo: r.tipo, descricao: r.descricao, marca: r.marca ?? '', unidade: r.unidade_venda,
  preco: cent(r.preco), custo: cent(r.custo), estoque: Number(r.estoque ?? 0), ativo: r.ativo !== false,
  codigo: r.codigo ?? undefined, indice: num(r.indice_refracao) ?? undefined, desenho: r.desenho_lente ?? undefined,
})

function receitaDeDb(r: Linha | null): Receita {
  if (!r) return receitaVazia()
  return {
    longe: {
      od: { esf: num(r.od_esf), cil: num(r.od_cil), eixo: num(r.od_eixo) },
      oe: { esf: num(r.oe_esf), cil: num(r.oe_cil), eixo: num(r.oe_eixo) },
    },
    perto: {
      od: { esf: num(r.od_esf_perto), cil: num(r.od_cil_perto), eixo: num(r.od_eixo_perto) },
      oe: { esf: num(r.oe_esf_perto), cil: num(r.oe_cil_perto), eixo: num(r.oe_eixo_perto) },
    },
    adicao: num(r.adicao),
    dnp: { od: num(r.od_dnp), oe: num(r.oe_dnp) },
    altura: { od: num(r.od_altura), oe: num(r.oe_altura) },
    armacao: {
      tipo: r.armacao_tipo ?? '', horizontal: num(r.armacao_horizontal), vertical: num(r.armacao_vertical),
      diagonal: num(r.armacao_diagonal), ponte: num(r.armacao_ponte),
    },
    observacoes: r.observacoes ?? '',
    lidaPorIa: !!r.lida_por_ia,
    conferida: r.conferida !== false,
  }
}

const receitaParaDb = (r: Receita) => ({
  od_esf: r.longe.od.esf, od_cil: r.longe.od.cil, od_eixo: r.longe.od.eixo,
  oe_esf: r.longe.oe.esf, oe_cil: r.longe.oe.cil, oe_eixo: r.longe.oe.eixo,
  od_dnp: r.dnp.od, oe_dnp: r.dnp.oe, od_altura: r.altura.od, oe_altura: r.altura.oe,
  adicao: r.adicao,
  od_esf_perto: r.perto.od.esf, od_cil_perto: r.perto.od.cil, od_eixo_perto: r.perto.od.eixo,
  oe_esf_perto: r.perto.oe.esf, oe_cil_perto: r.perto.oe.cil, oe_eixo_perto: r.perto.oe.eixo,
  armacao_tipo: r.armacao.tipo || null, armacao_horizontal: r.armacao.horizontal, armacao_vertical: r.armacao.vertical,
  armacao_diagonal: r.armacao.diagonal, armacao_ponte: r.armacao.ponte,
  observacoes: r.observacoes || null, lida_por_ia: r.lidaPorIa, conferida: r.conferida,
})

function osDeDb(r: Linha): OrdemServico {
  const cred = umOuNada(r.crediarios)
  return {
    id: r.id, numero: r.numero, clienteId: r.cliente_id, vendedorId: r.vendedor_id ?? '', laboratorioId: r.laboratorio_id,
    status: r.status, dataOs: r.data_os, previsao: r.previsao_entrega, controleInterno: r.controle_interno ?? '',
    observacoes: r.observacoes ?? '', receita: receitaDeDb(umOuNada(r.receitas)),
    itens: ((r.os_itens ?? []) as Linha[]).map(i => ({
      id: i.id, produtoId: i.produto_id, descricao: i.descricao, unidade: i.unidade, quantidade: Number(i.quantidade),
      valorUnitario: cent(i.valor_unitario), desconto: cent(i.desconto),
    })),
    descontoGeral: cent(r.desconto),
    pagamentos: ((r.caixa_movimentos ?? []) as Linha[])
      .filter(m => m.tipo === 'entrada' && !m.parcela_id)
      .map(m => ({ id: m.id, forma: m.forma, valor: cent(m.valor), em: String(m.em).slice(0, 10) })),
    crediario: cred ? { jurosMesPct: Number(cred.juros_mes_pct), totalCentavos: cent(cred.valor_total) } : null,
  }
}

const TIPO_AGENDA: Record<string, string> = { exame: 'Exame de vista', retirada: 'Retirada', ajuste: 'Ajuste', outro: 'Outro' }
const tipoAgendaParaDb = (rotulo: string) =>
  Object.entries(TIPO_AGENDA).find(([, r]) => r === rotulo)?.[0] ?? 'outro'

/** timestamptz → "aaaa-mm-ddThh:mm" no fuso do navegador */
function paraLocal(ts: string): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// ---------- carga ----------
export async function carregarTudo(lojaId: string) {
  const [cl, pr, lab, vend, os, parc, ag] = await Promise.all([
    sb.from('clientes').select('*').eq('loja_id', lojaId).order('nome'),
    sb.from('produtos').select('*').eq('loja_id', lojaId).order('descricao'),
    sb.from('laboratorios').select('*').eq('loja_id', lojaId).order('nome'),
    sb.from('perfis').select('id, nome, papel, email, ativo').eq('loja_id', lojaId).order('nome'),
    sb.from('ordens_servico').select('*, receitas(*), os_itens(*), caixa_movimentos(*), crediarios(*)').eq('loja_id', lojaId).order('numero', { ascending: false }),
    sb.from('parcelas').select('*, crediarios(os_id, ordens_servico(numero))').eq('loja_id', lojaId).order('vencimento'),
    sb.from('agendamentos').select('*, clientes(nome)').eq('loja_id', lojaId).order('inicio'),
  ])
  for (const [r, nome] of [[cl, 'clientes'], [pr, 'produtos'], [lab, 'laboratórios'], [vend, 'vendedores'], [os, 'ordens de serviço'], [parc, 'parcelas'], [ag, 'agenda']] as const) {
    falhou(r.error, `Carregar ${nome}`)
  }
  return {
    clientes: (cl.data as Linha[]).map(clienteDeDb),
    produtos: (pr.data as Linha[]).map(produtoDeDb),
    laboratorios: (lab.data as Linha[]).map((l): Laboratorio => ({ id: l.id, nome: l.nome, prazoDias: l.prazo_dias ?? 7, telefone: l.telefone ?? undefined, ativo: l.ativo !== false })),
    vendedores: (vend.data as Linha[]).filter(v => v.ativo).map((v): Vendedor => ({ id: v.id, nome: v.nome })),
    usuarios: (vend.data as Linha[]).map((v): Usuario => ({ id: v.id, nome: v.nome, papel: v.papel, email: v.email ?? '', ativo: v.ativo !== false })),
    ordens: (os.data as Linha[]).map(osDeDb),
    parcelas: (parc.data as Linha[]).map((p): Parcela => {
      const c = umOuNada(p.crediarios)
      return {
        id: p.id, numero: p.numero, vencimento: p.vencimento, valorCentavos: cent(p.valor), clienteId: p.cliente_id,
        osNumero: umOuNada(c?.ordens_servico)?.numero ?? 0, osId: c?.os_id, pago: p.status === 'paga',
      }
    }),
    agendamentos: (ag.data as Linha[]).map((a): Agendamento => ({
      id: a.id, clienteNome: a.nome_avulso ?? umOuNada(a.clientes)?.nome ?? '—',
      tipo: TIPO_AGENDA[a.tipo] ?? a.tipo, inicio: paraLocal(a.inicio), status: a.status,
    })),
  }
}

// ---------- gravações ----------
export async function inserirCliente(lojaId: string, c: Cliente) {
  const { error } = await sb.from('clientes').insert({
    id: c.id, loja_id: lojaId, nome: c.nome.trim(), cpf_cnpj: c.cpf.trim() || null, celular: c.celular.trim() || null,
    endereco: c.endereco?.trim() ? { texto: c.endereco.trim() } : null,
  })
  if (error?.code === '23505') throw new Error('Já existe um cliente com esse CPF/CNPJ nesta loja.')
  falhou(error, 'Salvar cliente')
}

export async function gravarOs(lojaId: string, os: OrdemServico): Promise<number> {
  const linha = {
    loja_id: lojaId, cliente_id: os.clienteId, vendedor_id: os.vendedorId || null, laboratorio_id: os.laboratorioId,
    status: os.status, data_os: os.dataOs, previsao_entrega: os.previsao, controle_interno: os.controleInterno || null,
    observacoes: os.observacoes || null, subtotal: reais(subtotal(os.itens)), desconto: reais(os.descontoGeral),
    total: reais(totalOs(os.itens, os.descontoGeral)),
  }
  let numero = os.numero
  if (!numero) {
    const { data, error } = await sb.from('ordens_servico').insert({ id: os.id, ...linha }).select('numero').single()
    falhou(error, 'Criar OS')
    numero = (data as Linha).numero
  } else {
    const { error } = await sb.from('ordens_servico').update(linha).eq('id', os.id)
    falhou(error, 'Atualizar OS')
  }

  const rec = await sb.from('receitas').upsert({ os_id: os.id, loja_id: lojaId, ...receitaParaDb(os.receita) })
  falhou(rec.error, 'Salvar receita')

  const del = await sb.from('os_itens').delete().eq('os_id', os.id)
  falhou(del.error, 'Atualizar itens')
  if (os.itens.length) {
    const ins = await sb.from('os_itens').insert(os.itens.map((i: ItemOs) => ({
      id: i.id, loja_id: lojaId, os_id: os.id, produto_id: i.produtoId, descricao: i.descricao, unidade: i.unidade,
      quantidade: i.quantidade, valor_unitario: reais(i.valorUnitario), desconto: reais(i.desconto),
    })))
    falhou(ins.error, 'Salvar itens')
  }

  const novos = os.pagamentos.filter(p => p.novo)
  if (novos.length) {
    const pg = await sb.from('caixa_movimentos').insert(novos.map(p => ({
      id: p.id, loja_id: lojaId, os_id: os.id, tipo: 'entrada', forma: p.forma, valor: reais(p.valor),
      descricao: `Entrada OS ${numero}`,
    })))
    falhou(pg.error, 'Lançar entrada no caixa')
  }
  return numero
}

export async function criarCrediario(osId: string, valorCentavos: Centavos, jurosMesPct: number, metodo: MetodoJuros, lista: ParcelaSimulada[]) {
  const { error } = await sb.rpc('gerar_crediario', {
    p_os_id: osId,
    p_valor_financiado: reais(valorCentavos),
    p_juros_mes_pct: jurosMesPct,
    p_metodo: metodo,
    p_parcelas: lista.map(p => ({ numero: p.numero, vencimento: p.vencimento, valor: reais(p.valorCentavos) })),
  })
  falhou(error, 'Gerar crediário')
}

export async function darBaixaParcela(lojaId: string, p: Parcela, forma: FormaPagamento) {
  const up = await sb.from('parcelas')
    .update({ status: 'paga', valor_pago: reais(p.valorCentavos), pago_em: hojeISO() })
    .eq('id', p.id)
  falhou(up.error, 'Dar baixa na parcela')
  const mv = await sb.from('caixa_movimentos').insert({
    loja_id: lojaId, os_id: p.osId ?? null, parcela_id: p.id, tipo: 'entrada', forma, valor: reais(p.valorCentavos),
    descricao: `Parcela ${p.numero} da OS ${p.osNumero}`,
  })
  falhou(mv.error, 'Lançar baixa no caixa')
}

export async function gravarProduto(lojaId: string, p: Produto) {
  const { error } = await sb.from('produtos').upsert({
    id: p.id, loja_id: lojaId, tipo: p.tipo, descricao: p.descricao.trim(), marca: p.marca.trim() || null,
    codigo: p.codigo?.trim() || null, unidade_venda: p.unidade, custo: reais(p.custo), preco: reais(p.preco),
    estoque: p.estoque, ativo: p.ativo,
    indice_refracao: p.tipo === 'lente' ? p.indice ?? null : null,
    desenho_lente: p.tipo === 'lente' ? p.desenho || null : null,
  })
  falhou(error, 'Salvar produto')
}

export async function gravarLaboratorio(lojaId: string, l: Laboratorio) {
  const { error } = await sb.from('laboratorios').upsert({
    id: l.id, loja_id: lojaId, nome: l.nome.trim(), prazo_dias: l.prazoDias, telefone: l.telefone?.trim() || null, ativo: l.ativo,
  })
  falhou(error, 'Salvar laboratório')
}

export async function inserirAgendamento(lojaId: string, a: Agendamento) {
  const { error } = await sb.from('agendamentos').insert({
    id: a.id, loja_id: lojaId, nome_avulso: a.clienteNome, tipo: tipoAgendaParaDb(a.tipo),
    inicio: new Date(a.inicio).toISOString(), status: a.status,
  })
  falhou(error, 'Salvar agendamento')
}

export async function atualizarStatusAgendamento(id: string, status: Agendamento['status']) {
  const { error } = await sb.from('agendamentos').update({ status }).eq('id', id)
  falhou(error, 'Atualizar agendamento')
}

// ---------- usuários (Edge Function gerenciar-usuarios) ----------
export async function chamarGerenciarUsuarios(corpo: Record<string, unknown>): Promise<Linha> {
  const { data, error } = await sb.functions.invoke('gerenciar-usuarios', { body: corpo })
  if (error) {
    // A função devolve { erro: "mensagem" } com status 4xx: mostra a mensagem dela
    let msg = error.message
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try { const j = await ctx.json(); if (j?.erro) msg = j.erro } catch { /* mantém a mensagem padrão */ }
    }
    if (/Failed to send a request|FunctionsFetchError|not found/i.test(msg)) {
      msg = 'A função de usuários ainda não está publicada no Supabase (gerenciar-usuarios).'
    }
    throw new Error(msg)
  }
  return data as Linha
}

export async function trocarSenhaPropria(novaSenha: string) {
  const { error } = await sb.auth.updateUser({ password: novaSenha, data: { trocar_senha: false } })
  if (error) {
    if (/different from the old|same/i.test(error.message)) throw new Error('A nova senha precisa ser diferente da atual.')
    if (/weak|least/i.test(error.message)) throw new Error('Senha fraca: use pelo menos 8 caracteres, misturando letras e números.')
    throw new Error(`Não foi possível trocar a senha: ${error.message}`)
  }
}
