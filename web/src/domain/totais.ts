// Totais da OS — ver docs/regras-de-negocio.md §2. Tudo em centavos.
import type { Centavos } from './formatos'

export type UnidadeVenda = 'UN' | 'PAR'
export type TipoProduto = 'lente' | 'armacao' | 'lente_contato' | 'acessorio' | 'servico'

export interface ItemOs {
  id: string
  produtoId: string | null
  descricao: string
  unidade: UnidadeVenda
  quantidade: number
  valorUnitario: Centavos
  desconto: Centavos
}

export const totalItem = (i: ItemOs): Centavos =>
  Math.max(0, Math.round(i.quantidade * i.valorUnitario) - i.desconto)

export const subtotal = (itens: ItemOs[]): Centavos => itens.reduce((s, i) => s + totalItem(i), 0)

export const totalOs = (itens: ItemOs[], descontoGeral: Centavos): Centavos =>
  Math.max(0, subtotal(itens) - descontoGeral)

/** Lente vendida por unidade → 2 (um par); demais → 1 */
export function quantidadeSugerida(tipo: TipoProduto, unidade: UnidadeVenda): number {
  return tipo === 'lente' && unidade === 'UN' ? 2 : 1
}
