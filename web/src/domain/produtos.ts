// Regras do cadastro de produtos e laboratórios. Valores em centavos.
import type { Centavos } from './formatos'
import type { TipoProduto, UnidadeVenda } from './totais'

export const TIPOS_PRODUTO: Record<TipoProduto, string> = {
  lente: 'Lente',
  armacao: 'Armação',
  lente_contato: 'Lente de contato',
  acessorio: 'Acessório',
  servico: 'Serviço',
}

export const INDICES_REFRACAO = [1.5, 1.56, 1.59, 1.61, 1.67, 1.74]
export const DESENHOS_LENTE = ['monofocal', 'multifocal', 'ocupacional', 'bifocal'] as const

/** Unidade padrão ao escolher o tipo: lente costuma ter preço por unidade; o resto, por unidade também. */
export const unidadePadrao = (_tipo: TipoProduto): UnidadeVenda => 'UN'

/** Margem sobre o preço de venda, em %, com 1 casa. Null se não há preço. */
export function margemPct(preco: Centavos, custo: Centavos): number | null {
  if (preco <= 0) return null
  return Math.round(((preco - custo) / preco) * 1000) / 10
}

export interface ProdutoForm {
  tipo: TipoProduto
  descricao: string
  preco: Centavos
  custo: Centavos
  estoque: number
  indice?: number | null
}

export function validarProduto(p: ProdutoForm): Record<string, string> {
  const e: Record<string, string> = {}
  if (!p.descricao.trim()) e.descricao = 'Informe a descrição'
  else if (p.descricao.trim().length > 120) e.descricao = 'Use até 120 caracteres'
  if (p.preco < 0) e.preco = 'Preço não pode ser negativo'
  if (p.preco === 0 && p.tipo !== 'servico') e.preco = 'Informe o preço de venda'
  if (p.custo < 0) e.custo = 'Custo não pode ser negativo'
  if (!Number.isFinite(p.estoque)) e.estoque = 'Estoque inválido'
  if (p.indice !== undefined && p.indice !== null && p.tipo === 'lente' && !INDICES_REFRACAO.includes(p.indice)) {
    e.indice = 'Índice fora da lista'
  }
  return e
}

export function validarLaboratorio(l: { nome: string; prazoDias: number }): Record<string, string> {
  const e: Record<string, string> = {}
  if (!l.nome.trim()) e.nome = 'Informe o nome'
  if (!Number.isInteger(l.prazoDias) || l.prazoDias < 0 || l.prazoDias > 90) e.prazoDias = 'Prazo entre 0 e 90 dias'
  return e
}
