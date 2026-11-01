// Estado do app. Em produção carrega a loja do usuário do Supabase e grava a cada
// ação; no modo demonstração usa os dados de exemplo de mock.ts em memória.
import { useSyncExternalStore } from 'react'
import type { Centavos } from '../domain/formatos'
import type { Receita } from '../domain/receita'
import type { ItemOs, TipoProduto, UnidadeVenda } from '../domain/totais'
import type { MetodoJuros, ParcelaSimulada } from '../domain/crediario'
import type { StatusInteressado } from '../domain/catalogo'
import type { FormaRecibo } from '../domain/recibos'
import { formatarWhatsapp } from '../domain/catalogo'
import { MODO_DEMO } from '../lib/supabase'
import * as repo from './repo'

export type StatusOs = 'orcamento' | 'aberta' | 'em_laboratorio' | 'aguardando_retirada' | 'finalizada' | 'cancelada'
export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'crediario_loja'

export const STATUS_OS: Record<StatusOs, { rotulo: string; tom: string }> = {
  orcamento: { rotulo: 'Orçamento', tom: 'neutro' },
  aberta: { rotulo: 'Aberta', tom: 'info' },
  em_laboratorio: { rotulo: 'Em laboratório', tom: 'alerta' },
  aguardando_retirada: { rotulo: 'Aguardando retirada', tom: 'destaque' },
  finalizada: { rotulo: 'Finalizada', tom: 'ok' },
  cancelada: { rotulo: 'Cancelada', tom: 'erro' },
}

export const FORMAS: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_debito: 'Cartão de débito',
  cartao_credito: 'Cartão de crédito',
  crediario_loja: 'Crediário da loja',
}

export interface Loja {
  id: string; nome: string; cnpj: string; telefone: string; endereco: string; logoUrl?: string; logoIconeUrl?: string; codigo?: number
  /** dados usados no recibo */
  email?: string; redesSociais?: string; corRecibo?: string; assinaturaPath?: string
}
/** Retrato da loja gravado em cada recibo (não muda depois de emitido) */
export interface EmissorRecibo { nome: string; documento: string; telefone: string; email: string; endereco: string; redes_sociais: string; cor: string }
export interface Recibo {
  id: string; numero: number; codigo: string; dataEmissao: string
  clienteId: string | null; clienteNome: string; clienteDocumento: string; osId: string | null
  descricao: string; valor: Centavos; forma: FormaRecibo; parcelas: number; primeiraParcela: string | null
  emissor: EmissorRecibo; hash: string; status: 'emitido' | 'cancelado'; canceladoEm: string | null
  assinaturaClientePath: string | null; assinadoEm: string | null; assinadoIp: string | null; assinadoVia: string | null
  criadoEm: string
}
export interface NovoRecibo {
  dataEmissao: string; clienteId: string | null; clienteNome: string; clienteDocumento: string; osId: string | null
  descricao: string; valor: Centavos; forma: FormaRecibo; parcelas: number; primeiraParcela: string | null
}
export interface Cliente { id: string; nome: string; cpf: string; celular: string; nascimento?: string; endereco?: string }
export interface Produto {
  id: string; tipo: TipoProduto; descricao: string; marca: string; unidade: UnidadeVenda
  preco: Centavos; custo: Centavos; estoque: number; ativo: boolean
  codigo?: string; indice?: number; desenho?: string
  /** catálogo da loja */
  fotoUrl?: string; noCatalogo?: boolean
  /** imagem de frente, fundo transparente, para o provador virtual */
  provadorUrl?: string
}
export interface Catalogo { slug: string; ativo: boolean; whatsapp: string; titulo: string; apresentacao: string }
export interface Interessado {
  id: string; produtoId: string | null; produtoDescricao: string | null; nome: string; whatsapp: string
  status: StatusInteressado; clienteId: string | null; criadoEm: string
}
export interface ProdutoPublico { id: string; tipo: TipoProduto; descricao: string; marca: string; preco: Centavos; fotoUrl?: string; provadorUrl?: string; codigo?: string }
export interface CatalogoPublico {
  loja: { nome: string; telefone: string; logoUrl?: string; logoIconeUrl?: string }
  titulo: string; apresentacao: string; whatsapp: string; produtos: ProdutoPublico[]
}
export interface Laboratorio { id: string; nome: string; prazoDias: number; telefone?: string; ativo: boolean }
export interface Vendedor { id: string; nome: string }
export type Papel = 'admin' | 'gerente' | 'vendedor' | 'vendedor_externo' | 'caixa'
export interface Usuario { id: string; nome: string; papel: Papel; email: string; ativo: boolean }
export const PAPEIS: Record<Papel, string> = {
  admin: 'Administrador', gerente: 'Gerente', vendedor: 'Vendedor', vendedor_externo: 'Vendedor externo', caixa: 'Caixa',
}
/** `novo`: ainda não gravado no caixa (é gravado ao salvar a OS) */
export interface Pagamento { id: string; forma: FormaPagamento; valor: Centavos; em: string; novo?: boolean }
export interface Parcela extends ParcelaSimulada { id: string; osNumero: number; osId?: string; clienteId: string; pago: boolean }

export interface OrdemServico {
  id: string
  numero: number
  clienteId: string
  vendedorId: string
  laboratorioId: string | null
  status: StatusOs
  dataOs: string
  previsao: string | null
  controleInterno: string
  observacoes: string
  receita: Receita
  itens: ItemOs[]
  descontoGeral: Centavos
  pagamentos: Pagamento[]
  crediario: { jurosMesPct: number; totalCentavos: Centavos } | null
}

export interface Agendamento { id: string; clienteNome: string; tipo: string; inicio: string; status: 'agendado' | 'realizado' | 'cancelado' }

// ---- estado reativo ----
interface Estado {
  loja: Loja
  usuario: string
  perfilId: string
  papel: Papel
  trocarSenha: boolean
  usuarios: Usuario[]
  carregando: boolean
  erro: string
  clientes: Cliente[]
  produtos: Produto[]
  laboratorios: Laboratorio[]
  vendedores: Vendedor[]
  ordens: OrdemServico[]
  parcelas: Parcela[]
  agendamentos: Agendamento[]
  /** false enquanto a migração 5 (catálogo) não foi aplicada no banco */
  catalogoDisponivel: boolean
  /** false enquanto a migração 6 (provador) não foi aplicada */
  provadorDisponivel: boolean
  catalogo: Catalogo | null
  interessados: Interessado[]
  /** false enquanto a migração 8 (recibos) não foi aplicada */
  recibosDisponivel: boolean
  recibos: Recibo[]
}

const vazio: Estado = {
  loja: { id: '', nome: '', cnpj: '', telefone: '', endereco: '' }, usuario: '', perfilId: '', papel: 'vendedor', trocarSenha: false, usuarios: [], carregando: false, erro: '',
  clientes: [], produtos: [], laboratorios: [], vendedores: [], ordens: [], parcelas: [], agendamentos: [],
  catalogoDisponivel: false, provadorDisponivel: false, catalogo: null, interessados: [],
  recibosDisponivel: false, recibos: [],
}

let estado: Estado = vazio
const ouvintes = new Set<() => void>()
const emitir = () => ouvintes.forEach(f => f())
const assinar = (f: () => void) => { ouvintes.add(f); return () => ouvintes.delete(f) }
export const useStore = () => useSyncExternalStore(assinar, () => estado)
const atualizar = (fn: (e: Estado) => Partial<Estado>) => { estado = { ...estado, ...fn(estado) }; emitir() }

export const novoId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)

export const limparErro = () => atualizar(() => ({ erro: '' }))

/** Executa uma ação; se falhar, mostra o erro no topo do app e devolve null. */
export async function tentar<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (e) {
    atualizar(() => ({ erro: e instanceof Error ? e.message : String(e) }))
    return null
  }
}

// ---- sessão ----
export type ResultadoInicio = 'ok' | 'sem_loja'

export async function iniciar(): Promise<ResultadoInicio> {
  if (MODO_DEMO) {
    const { dadosDemo } = await import('./mock')
    const demo = dadosDemo()
    estado = {
      ...vazio, ...demo, usuario: 'Demonstração', perfilId: 'demo-admin', papel: 'admin',
      usuarios: [
        { id: 'demo-admin', nome: 'Demonstração', papel: 'admin', email: 'demo@exemplo.com', ativo: true },
        ...demo.vendedores.map(v => ({ id: v.id, nome: v.nome, papel: 'vendedor' as Papel, email: `${v.nome.toLowerCase()}@exemplo.com`, ativo: true })),
      ],
    }
    emitir()
    return 'ok'
  }
  atualizar(() => ({ carregando: true, erro: '' }))
  try {
    const perfil = await repo.carregarPerfil()
    if (!perfil) { atualizar(() => ({ carregando: false })); return 'sem_loja' }
    const [dados, cat, rec] = await Promise.all([repo.carregarTudo(perfil.loja.id), repo.carregarCatalogo(perfil.loja.id), repo.carregarRecibos(perfil.loja.id)])
    estado = {
      ...vazio, ...dados, catalogoDisponivel: cat.disponivel, provadorDisponivel: cat.provador, recibosDisponivel: rec.disponivel, recibos: rec.recibos, catalogo: cat.catalogo, interessados: cat.interessados, loja: perfil.loja, usuario: perfil.nomeUsuario, perfilId: perfil.perfilId, papel: perfil.papel, trocarSenha: perfil.trocarSenha,
    }
    emitir()
    return 'ok'
  } catch (e) {
    atualizar(() => ({ carregando: false, erro: e instanceof Error ? e.message : String(e) }))
    throw e
  }
}

export const encerrar = () => { estado = vazio; emitir() }

// ---- ações (gravam no Supabase e atualizam a tela) ----
export async function salvarCliente(c: Omit<Cliente, 'id'>): Promise<Cliente> {
  const novo: Cliente = { ...c, id: novoId() }
  if (!MODO_DEMO) await repo.inserirCliente(estado.loja.id, novo)
  atualizar(e => ({ clientes: [...e.clientes, novo].sort((a, b) => a.nome.localeCompare(b.nome)) }))
  return novo
}

export async function salvarOs(os: OrdemServico): Promise<OrdemServico> {
  const numero = MODO_DEMO
    ? os.numero || Math.max(0, ...estado.ordens.map(o => o.numero)) + 1
    : await repo.gravarOs(estado.loja.id, os)
  const salva: OrdemServico = { ...os, numero, pagamentos: os.pagamentos.map(p => ({ ...p, novo: false })) }
  atualizar(e => ({
    ordens: e.ordens.some(o => o.id === os.id) ? e.ordens.map(o => (o.id === os.id ? salva : o)) : [salva, ...e.ordens],
  }))
  return salva
}

export async function gerarParcelas(
  os: OrdemServico,
  p: { valorCentavos: Centavos; jurosMesPct: number; metodo: MetodoJuros; lista: ParcelaSimulada[] },
) {
  if (!MODO_DEMO) await repo.criarCrediario(os.id, p.valorCentavos, p.jurosMesPct, p.metodo, p.lista)
  const total = p.lista.reduce((s, x) => s + x.valorCentavos, 0)
  atualizar(e => ({
    ordens: e.ordens.map(o => (o.id === os.id ? { ...o, crediario: { jurosMesPct: p.jurosMesPct, totalCentavos: total } } : o)),
    parcelas: [
      ...e.parcelas.filter(x => x.osNumero !== os.numero),
      ...p.lista.map(x => ({ ...x, id: novoId(), osNumero: os.numero, osId: os.id, clienteId: os.clienteId, pago: false })),
    ],
  }))
  // Em produção, recarrega as parcelas para ter os ids reais do banco (necessários para a baixa)
  if (!MODO_DEMO) {
    const dados = await repo.carregarTudo(estado.loja.id)
    atualizar(() => ({ parcelas: dados.parcelas }))
  }
}

export async function baixarParcela(id: string, forma: FormaPagamento = 'dinheiro') {
  const p = estado.parcelas.find(x => x.id === id)
  if (!p) return
  if (!MODO_DEMO) await repo.darBaixaParcela(estado.loja.id, p, forma)
  atualizar(e => ({ parcelas: e.parcelas.map(x => (x.id === id ? { ...x, pago: true } : x)) }))
}

export async function salvarProduto(p: Produto): Promise<Produto> {
  if (!MODO_DEMO) await repo.gravarProduto(estado.loja.id, p, estado.catalogoDisponivel, estado.provadorDisponivel)
  atualizar(e => ({
    produtos: (e.produtos.some(x => x.id === p.id) ? e.produtos.map(x => (x.id === p.id ? p : x)) : [...e.produtos, p])
      .sort((a, b) => a.descricao.localeCompare(b.descricao)),
  }))
  return p
}

export async function salvarLaboratorio(l: Laboratorio): Promise<Laboratorio> {
  if (!MODO_DEMO) await repo.gravarLaboratorio(estado.loja.id, l)
  atualizar(e => ({
    laboratorios: (e.laboratorios.some(x => x.id === l.id) ? e.laboratorios.map(x => (x.id === l.id ? l : x)) : [...e.laboratorios, l])
      .sort((a, b) => a.nome.localeCompare(b.nome)),
  }))
  return l
}

export async function salvarAgendamento(a: Omit<Agendamento, 'id'>) {
  const novo: Agendamento = { ...a, id: novoId() }
  if (!MODO_DEMO) await repo.inserirAgendamento(estado.loja.id, novo)
  atualizar(e => ({ agendamentos: [...e.agendamentos, novo] }))
}

export async function mudarStatusAgendamento(id: string, status: Agendamento['status']) {
  if (!MODO_DEMO) await repo.atualizarStatusAgendamento(id, status)
  atualizar(e => ({ agendamentos: e.agendamentos.map(a => (a.id === id ? { ...a, status } : a)) }))
}


// ---- usuários e senha ----
export const podeGerenciarUsuarios = (p: Papel) => p === 'admin' || p === 'gerente'

const sincronizarVendedores = (usuarios: Usuario[]) =>
  usuarios.filter(u => u.ativo).map(u => ({ id: u.id, nome: u.nome })).sort((a, b) => a.nome.localeCompare(b.nome))

export async function criarUsuario(u: { email: string; nome: string; papel: Papel; senha: string }): Promise<{ loginExistente: boolean }> {
  let novo: Usuario
  let loginExistente = false
  if (MODO_DEMO) {
    novo = { id: novoId(), nome: u.nome.trim(), papel: u.papel, email: u.email.trim().toLowerCase(), ativo: true }
  } else {
    const r = await repo.chamarGerenciarUsuarios({ acao: 'criar', ...u })
    novo = { id: r.perfil.id, nome: r.perfil.nome, papel: r.perfil.papel, email: r.perfil.email ?? u.email, ativo: true }
    loginExistente = !!r.login_existente
  }
  atualizar(e => {
    const usuarios = [...e.usuarios, novo].sort((a, b) => a.nome.localeCompare(b.nome))
    return { usuarios, vendedores: sincronizarVendedores(usuarios) }
  })
  return { loginExistente }
}

export async function alterarUsuario(id: string, mudar: Partial<Pick<Usuario, 'nome' | 'papel' | 'ativo'>>) {
  if (!MODO_DEMO) await repo.chamarGerenciarUsuarios({ acao: 'alterar', perfil_id: id, ...mudar })
  atualizar(e => {
    const usuarios = e.usuarios.map(u => (u.id === id ? { ...u, ...mudar } : u))
    return { usuarios, vendedores: sincronizarVendedores(usuarios) }
  })
}

export async function redefinirSenhaUsuario(id: string, senha: string) {
  if (!MODO_DEMO) await repo.chamarGerenciarUsuarios({ acao: 'redefinir_senha', perfil_id: id, senha })
}

export async function trocarMinhaSenha(novaSenha: string) {
  if (!MODO_DEMO) await repo.trocarSenhaPropria(novaSenha)
  atualizar(() => ({ trocarSenha: false }))
}

// ---- catálogo ----
export async function salvarCatalogo(c: Catalogo) {
  if (!MODO_DEMO) await repo.gravarCatalogo(estado.loja.id, c)
  atualizar(() => ({ catalogo: c }))
}

/** Reduz e envia a foto; devolve o endereço para guardar no produto */
export async function enviarFotoProduto(produtoId: string, foto: Blob, tipo: 'foto' | 'provador' = 'foto'): Promise<string> {
  if (MODO_DEMO) return URL.createObjectURL(foto)
  return repo.enviarFotoProduto(estado.loja.id, produtoId, foto, tipo)
}

export async function mudarStatusInteressado(id: string, status: StatusInteressado) {
  if (!MODO_DEMO) await repo.atualizarInteressado(id, { status })
  atualizar(e => ({ interessados: e.interessados.map(i => (i.id === id ? { ...i, status } : i)) }))
}

/** Cadastra o interessado como cliente (ou liga a um cliente com o mesmo celular) */
export async function interessadoVirarCliente(id: string): Promise<Cliente | null> {
  const i = estado.interessados.find(x => x.id === id)
  if (!i) return null
  const digitos = (t: string) => t.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  const existente = estado.clientes.find(c => c.celular && digitos(c.celular) === digitos(i.whatsapp))
  const cliente = existente ?? await salvarCliente({ nome: i.nome, cpf: '', celular: formatarWhatsapp(i.whatsapp) })
  if (!MODO_DEMO) await repo.atualizarInteressado(id, { status: 'virou_cliente', clienteId: cliente.id })
  atualizar(e => ({ interessados: e.interessados.map(x => (x.id === id ? { ...x, status: 'virou_cliente', clienteId: cliente.id } : x)) }))
  return cliente
}

/** Catálogo público: no modo demonstração monta a partir dos dados de exemplo */
export async function abrirCatalogoPublico(slug: string): Promise<CatalogoPublico | null> {
  if (!MODO_DEMO) return repo.carregarCatalogoPublico(slug)
  const c = estado.catalogo
  if (!c || !c.ativo) return null
  return {
    loja: { nome: estado.loja.nome, telefone: estado.loja.telefone, logoUrl: estado.loja.logoUrl, logoIconeUrl: estado.loja.logoIconeUrl },
    titulo: c.titulo, apresentacao: c.apresentacao, whatsapp: c.whatsapp,
    produtos: estado.produtos.filter(p => p.ativo && p.noCatalogo)
      .map(p => ({ id: p.id, tipo: p.tipo, descricao: p.descricao, marca: p.marca, preco: p.preco, fotoUrl: p.fotoUrl, provadorUrl: p.provadorUrl, codigo: p.codigo })),
  }
}

export async function registrarInteressePublico(slug: string, produto: ProdutoPublico | null, nome: string, whatsapp: string) {
  if (!MODO_DEMO) return repo.registrarInteresse(slug, produto?.id ?? null, nome, whatsapp)
  const novo: Interessado = {
    id: novoId(), produtoId: produto?.id ?? null, produtoDescricao: produto?.descricao ?? null, nome: nome.trim(),
    whatsapp, status: 'novo', clienteId: null, criadoEm: new Date().toISOString(),
  }
  atualizar(e => ({ interessados: [novo, ...e.interessados] }))
}

// ---- recibos ----
export function emissorDaLoja(l: Loja): EmissorRecibo {
  return {
    nome: l.nome, documento: (l.cnpj || '').replace(/\D/g, ''), telefone: l.telefone || '', email: l.email || '',
    endereco: l.endereco || '', redes_sociais: l.redesSociais || '', cor: l.corRecibo || '#7a2e4d',
  }
}

async function sha256(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Emite o recibo (e cancela o antigo, quando é uma edição). Devolve o recibo com o código de autenticidade. */
export async function emitirRecibo(dados: NovoRecibo, substituirId?: string): Promise<Recibo> {
  const emissor = emissorDaLoja(estado.loja)
  let r: Recibo
  if (MODO_DEMO) {
    const numero = Math.max(0, ...estado.recibos.map(x => x.numero)) + 1
    r = { ...dados, id: novoId(), numero, codigo: novoId().replace(/-/g, '').slice(0, 8).toUpperCase(), emissor, hash: '', status: 'emitido',
      canceladoEm: null, assinaturaClientePath: null, assinadoEm: null, assinadoIp: null, assinadoVia: null, criadoEm: new Date().toISOString() }
    r.hash = await sha256([r.id, r.numero, r.codigo, r.dataEmissao, r.clienteNome, r.clienteDocumento, String(r.valor / 100), r.forma, r.parcelas, r.primeiraParcela || '', emissor.documento, r.criadoEm].join('|'))
  } else {
    r = await repo.inserirRecibo(estado.loja.id, dados, emissor)
    r.hash = await sha256(repo.textoHashRecibo(r))
    await repo.gravarHashRecibo(r.id, r.hash)
  }
  if (substituirId) await cancelarRecibo(substituirId)
  atualizar(e => ({ recibos: [r, ...e.recibos] }))
  return r
}

export async function cancelarRecibo(id: string) {
  const quando = new Date().toISOString()
  if (!MODO_DEMO) await repo.cancelarRecibo(id, quando)
  atualizar(e => ({ recibos: e.recibos.map(r => (r.id === id ? { ...r, status: 'cancelado', canceladoEm: quando } : r)) }))
}

/** Assinatura do cliente desenhada na tela da loja */
export async function assinarReciboNaTela(id: string, imagem: Blob) {
  const quando = new Date().toISOString()
  const path = MODO_DEMO ? 'demo:' + URL.createObjectURL(imagem) : await repo.assinarReciboNaTela(estado.loja.id, id, imagem, quando)
  atualizar(e => ({ recibos: e.recibos.map(r => (r.id === id ? { ...r, assinaturaClientePath: path, assinadoEm: quando, assinadoVia: 'tela' } : r)) }))
}

/** Endereço (temporário) de uma imagem guardada: assinatura da loja ou do cliente */
export async function imagemRecibo(path: string | null | undefined): Promise<string | null> {
  if (!path) return null
  if (path.startsWith('demo:')) return path.slice(5)
  if (MODO_DEMO) return null
  return repo.imagemPrivada(path)
}

export async function linkAssinaturaRecibo(id: string): Promise<string> {
  if (MODO_DEMO) return 'demo-' + id
  return repo.gerarLinkAssinatura(id)
}

export async function recarregarRecibos() {
  if (MODO_DEMO) return
  const r = await repo.carregarRecibos(estado.loja.id)
  atualizar(() => ({ recibos: r.recibos, recibosDisponivel: r.disponivel }))
}

/** Dados da loja que aparecem no recibo (só admin/gerente) */
export async function salvarDadosLoja(d: { cnpj: string; telefone: string; email: string; endereco: string; redesSociais: string; corRecibo: string }, assinatura?: Blob | null) {
  let assinaturaPath = estado.loja.assinaturaPath
  if (assinatura === null) assinaturaPath = undefined
  if (assinatura) assinaturaPath = MODO_DEMO ? 'demo:' + URL.createObjectURL(assinatura) : await repo.enviarAssinaturaLoja(estado.loja.id, assinatura)
  if (!MODO_DEMO) await repo.salvarDadosLoja(estado.loja.id, { ...d, assinaturaPath: assinaturaPath ?? '' })
  atualizar(e => ({ loja: { ...e.loja, cnpj: d.cnpj, telefone: d.telefone, email: d.email, endereco: d.endereco, redesSociais: d.redesSociais, corRecibo: d.corRecibo, assinaturaPath } }))
}
