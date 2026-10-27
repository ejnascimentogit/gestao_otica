// Conversões e formatação. Dinheiro sempre em centavos inteiros.

export type Centavos = number

export function paraCentavos(valor: string | number | null | undefined): Centavos {
  if (valor === null || valor === undefined || valor === '') return 0
  if (typeof valor === 'number') return Math.round(valor * 100)
  const limpo = valor.replace(/[R$\s]/g, '')
  // "1.234,56" → 1234.56 ; "1234.56" → 1234.56 ; "12,5" → 12.5
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  const n = Number(normalizado)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

const fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatarMoeda = (c: Centavos) => fmtMoeda.format(c / 100)

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

export const hojeISO = () => new Date().toISOString().slice(0, 10)

export function somarDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}
