// Dados de exemplo em memória. As funções exportadas têm a forma que terão
// com o Supabase (listar/salvar), para a troca ser módulo a módulo.
import { useSyncExternalStore } from 'react'
import { hojeISO, somarDias, type Centavos } from '../domain/formatos'
import { receitaVazia, type Receita } from '../domain/receita'
import type { ItemOs, TipoProduto, UnidadeVenda } from '../domain/totais'
import type { ParcelaSimulada } from '../domain/crediario'

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

export interface Cliente { id: string; nome: string; cpf: string; celular: string; nascimento?: string; endereco?: string }
export interface Produto { id: string; tipo: TipoProduto; descricao: string; marca: string; unidade: UnidadeVenda; preco: Centavos; indice?: number; estoque: number }
export interface Laboratorio { id: string; nome: string; prazoDias: number }
export interface Vendedor { id: string; nome: string }
export interface Pagamento { id: string; forma: FormaPagamento; valor: Centavos; em: string }
export interface Parcela extends ParcelaSimulada { id: string; osNumero: number; clienteId: string; pago: boolean }

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

const uid = () => Math.random().toString(36).slice(2, 10)
const hoje = hojeISO()

const clientes: Cliente[] = [
  { id: 'c1', nome: 'Maria das Graças Lima', cpf: '123.456.789-00', celular: '(81) 99876-5432', endereco: 'Rua do Sol, 120 — Boa Vista, Recife/PE' },
  { id: 'c2', nome: 'José Carlos Albuquerque', cpf: '987.654.321-00', celular: '(81) 98765-1234', endereco: 'Av. Norte, 455 — Casa Amarela, Recife/PE' },
  { id: 'c3', nome: 'Ana Beatriz Moura', cpf: '456.789.123-00', celular: '(81) 99123-4567' },
  { id: 'c4', nome: 'Roberto Fernandes', cpf: '321.654.987-00', celular: '(81) 99555-0101' },
]

const produtos: Produto[] = [
  { id: 'p1', tipo: 'lente', descricao: 'Lente monofocal 1.56 antirreflexo', marca: 'Genérica', unidade: 'UN', preco: 9000, indice: 1.56, estoque: 40 },
  { id: 'p2', tipo: 'lente', descricao: 'Lente monofocal 1.67 filtro azul', marca: 'Genérica', unidade: 'UN', preco: 22000, indice: 1.67, estoque: 18 },
  { id: 'p3', tipo: 'lente', descricao: 'Lente multifocal freeform 1.59', marca: 'Genérica', unidade: 'PAR', preco: 89000, indice: 1.59, estoque: 6 },
  { id: 'p4', tipo: 'lente', descricao: 'Lente fotossensível 1.56 + AR', marca: 'Genérica', unidade: 'UN', preco: 31000, indice: 1.56, estoque: 12 },
  { id: 'p5', tipo: 'armacao', descricao: 'Armação acetato retangular 54-18', marca: 'Casa', unidade: 'UN', preco: 24000, estoque: 9 },
  { id: 'p6', tipo: 'armacao', descricao: 'Armação metal redonda 50-20', marca: 'Casa', unidade: 'UN', preco: 19900, estoque: 5 },
  { id: 'p7', tipo: 'servico', descricao: 'Montagem e ajuste', marca: '—', unidade: 'UN', preco: 3000, estoque: 0 },
]

const laboratorios: Laboratorio[] = [
  { id: 'l1', nome: 'Lab Óptico Recife', prazoDias: 5 },
  { id: 'l2', nome: 'Surfaçagem Nordeste', prazoDias: 7 },
]

const vendedores: Vendedor[] = [
  { id: 'v1', nome: 'Carla' },
  { id: 'v2', nome: 'Paulo' },
]

function osExemplo(numero: number, clienteId: string, status: StatusOs, dias: number, itens: Array<[string, number]>, pago: number): OrdemServico {
  const r = receitaVazia()
  r.longe.od = { esf: -1.75, cil: -0.5, eixo: 180 }
  r.longe.oe = { esf: -2, cil: -0.75, eixo: 170 }
  r.dnp = { od: 31.5, oe: 32 }
  r.altura = { od: 19, oe: 19 }
  const its: ItemOs[] = itens.map(([pid, qtd]) => {
    const p = produtos.find(x => x.id === pid)!
    return { id: uid(), produtoId: pid, descricao: p.descricao, unidade: p.unidade, quantidade: qtd, valorUnitario: p.preco, desconto: 0 }
  })
  return {
    id: uid(), numero, clienteId, vendedorId: 'v1', laboratorioId: 'l1', status,
    dataOs: somarDias(hoje, -dias), previsao: somarDias(hoje, 5 - dias), controleInterno: '', observacoes: '',
    receita: r, itens: its, descontoGeral: 0,
    pagamentos: pago ? [{ id: uid(), forma: 'pix', valor: pago, em: somarDias(hoje, -dias) }] : [],
    crediario: null,
  }
}

const ordens: OrdemServico[] = [
  osExemplo(1, 'c1', 'finalizada', 12, [['p2', 2], ['p5', 1]], 68000),
  osExemplo(2, 'c2', 'em_laboratorio', 4, [['p3', 1], ['p6', 1]], 40000),
  osExemplo(3, 'c3', 'aguardando_retirada', 7, [['p1', 2], ['p5', 1], ['p7', 1]], 15000),
  osExemplo(4, 'c4', 'orcamento', 0, [['p4', 2]], 0),
]

const parcelas: Parcela[] = [
  { id: uid(), osNumero: 2, clienteId: 'c2', numero: 1, vencimento: somarDias(hoje, 10), valorCentavos: 35450, pago: false },
  { id: uid(), osNumero: 2, clienteId: 'c2', numero: 2, vencimento: somarDias(hoje, 40), valorCentavos: 35450, pago: false },
  { id: uid(), osNumero: 3, clienteId: 'c3', numero: 1, vencimento: somarDias(hoje, -3), valorCentavos: 18000, pago: false },
]

const agendamentos: Agendamento[] = [
  { id: uid(), clienteNome: 'Ana Beatriz Moura', tipo: 'Retirada', inicio: `${hoje}T10:00`, status: 'agendado' },
  { id: uid(), clienteNome: 'Fernanda Rocha', tipo: 'Exame de vista', inicio: `${hoje}T14:30`, status: 'agendado' },
  { id: uid(), clienteNome: 'Roberto Fernandes', tipo: 'Ajuste', inicio: `${somarDias(hoje, 1)}T09:00`, status: 'agendado' },
]

// ---- store reativo simples ----
let estado = { clientes, produtos, laboratorios, vendedores, ordens, parcelas, agendamentos }
type Estado = typeof estado
const ouvintes = new Set<() => void>()
const emitir = () => ouvintes.forEach(f => f())
const assinar = (f: () => void) => { ouvintes.add(f); return () => ouvintes.delete(f) }
export const useStore = () => useSyncExternalStore(assinar, () => estado)
const atualizar = (fn: (e: Estado) => Partial<Estado>) => { estado = { ...estado, ...fn(estado) }; emitir() }

export const novoId = uid

export function salvarCliente(c: Omit<Cliente, 'id'>): Cliente {
  const novo = { ...c, id: uid() }
  atualizar(e => ({ clientes: [...e.clientes, novo] }))
  return novo
}

export function salvarOs(os: OrdemServico): OrdemServico {
  const numero = os.numero || Math.max(0, ...estado.ordens.map(o => o.numero)) + 1
  const salva = { ...os, numero }
  atualizar(e => ({
    ordens: e.ordens.some(o => o.id === os.id) ? e.ordens.map(o => (o.id === os.id ? salva : o)) : [...e.ordens, salva],
  }))
  return salva
}

export function gerarParcelas(os: OrdemServico, lista: ParcelaSimulada[]) {
  atualizar(e => ({
    parcelas: [
      ...e.parcelas.filter(p => p.osNumero !== os.numero),
      ...lista.map(p => ({ ...p, id: uid(), osNumero: os.numero, clienteId: os.clienteId, pago: false })),
    ],
  }))
}

export function baixarParcela(id: string) {
  atualizar(e => ({ parcelas: e.parcelas.map(p => (p.id === id ? { ...p, pago: true } : p)) }))
}

export function salvarAgendamento(a: Omit<Agendamento, 'id'>) {
  atualizar(e => ({ agendamentos: [...e.agendamentos, { ...a, id: uid() }] }))
}

export function mudarStatusAgendamento(id: string, status: Agendamento['status']) {
  atualizar(e => ({ agendamentos: e.agendamentos.map(a => (a.id === id ? { ...a, status } : a)) }))
}

export const LOJA = { nome: 'Ótica Exemplo', cnpj: '00.000.000/0001-00', telefone: '(81) 3333-0000', endereco: 'Rua Exemplo, 100 — Recife/PE' }
