// Estado do app. Em produção carrega a loja do usuário do Supabase e grava a cada
// ação; no modo demonstração usa os dados de exemplo de mock.ts em memória.
import { useSyncExternalStore } from 'react'
import type { Centavos } from '../domain/formatos'
import type { Receita } from '../domain/receita'
import type { ItemOs, TipoProduto, UnidadeVenda } from '../domain/totais'
import type { MetodoJuros, ParcelaSimulada } from '../domain/crediario'
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

export interface Loja { id: string; nome: string; cnpj: string; telefone: string; endereco: string }
export interface Cliente { id: string; nome: string; cpf: string; celular: string; nascimento?: string; endereco?: string }
export interface Produto { id: string; tipo: TipoProduto; descricao: string; marca: string; unidade: UnidadeVenda; preco: Centavos; indice?: number; estoque: number }
export interface Laboratorio { id: string; nome: string; prazoDias: number }
export interface Vendedor { id: string; nome: string }
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
  carregando: boolean
  erro: string
  clientes: Cliente[]
  produtos: Produto[]
  laboratorios: Laboratorio[]
  vendedores: Vendedor[]
  ordens: OrdemServico[]
  parcelas: Parcela[]
  agendamentos: Agendamento[]
}

const vazio: Estado = {
  loja: { id: '', nome: '', cnpj: '', telefone: '', endereco: '' }, usuario: '', carregando: false, erro: '',
  clientes: [], produtos: [], laboratorios: [], vendedores: [], ordens: [], parcelas: [], agendamentos: [],
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
    estado = { ...vazio, ...dadosDemo(), usuario: 'Demonstração' }
    emitir()
    return 'ok'
  }
  atualizar(() => ({ carregando: true, erro: '' }))
  try {
    const perfil = await repo.carregarPerfil()
    if (!perfil) { atualizar(() => ({ carregando: false })); return 'sem_loja' }
    const dados = await repo.carregarTudo(perfil.loja.id)
    estado = { ...vazio, ...dados, loja: perfil.loja, usuario: perfil.nomeUsuario }
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

export async function salvarAgendamento(a: Omit<Agendamento, 'id'>) {
  const novo: Agendamento = { ...a, id: novoId() }
  if (!MODO_DEMO) await repo.inserirAgendamento(estado.loja.id, novo)
  atualizar(e => ({ agendamentos: [...e.agendamentos, novo] }))
}

export async function mudarStatusAgendamento(id: string, status: Agendamento['status']) {
  if (!MODO_DEMO) await repo.atualizarStatusAgendamento(id, status)
  atualizar(e => ({ agendamentos: e.agendamentos.map(a => (a.id === id ? { ...a, status } : a)) }))
}

