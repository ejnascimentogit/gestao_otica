// Crediário da loja — ver docs/regras-de-negocio.md §3. Tudo em centavos.
import type { Centavos } from './formatos'

export type MetodoJuros = 'price' | 'simples'

export interface ParametrosCrediario {
  valorCentavos: Centavos
  parcelas: number
  jurosMesPct: number
  metodo: MetodoJuros
  primeiroVencimento: string // ISO yyyy-mm-dd
  diaVencimento?: number // default: dia do primeiro vencimento
}

export interface ParcelaSimulada {
  numero: number
  vencimento: string
  valorCentavos: Centavos
}

export interface SimulacaoCrediario {
  parcelas: ParcelaSimulada[]
  totalCentavos: Centavos
  jurosCentavos: Centavos
  parcelaCentavos: Centavos
}

const ultimoDiaDoMes = (ano: number, mes0: number) => new Date(Date.UTC(ano, mes0 + 1, 0)).getUTCDate()

/** Data do vencimento k (0-based) mantendo o dia; dia inexistente → último dia do mês. */
export function vencimento(primeiro: string, k: number, dia?: number): string {
  const [a, m, d] = primeiro.split('-').map(Number)
  if (k === 0) return primeiro
  const alvoDia = dia ?? d
  const total = m - 1 + k
  const ano = a + Math.floor(total / 12)
  const mes0 = total % 12
  const diaFinal = Math.min(alvoDia, ultimoDiaDoMes(ano, mes0))
  return `${ano}-${String(mes0 + 1).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`
}

export function simularCrediario(p: ParametrosCrediario): SimulacaoCrediario {
  const n = Math.max(1, Math.min(24, Math.floor(p.parcelas)))
  const i = Math.max(0, p.jurosMesPct) / 100
  const v = Math.max(0, Math.round(p.valorCentavos))

  let parcela: number
  if (i === 0) parcela = v / n
  else if (p.metodo === 'simples') parcela = (v * (1 + i * n)) / n
  else parcela = (v * i) / (1 - Math.pow(1 + i, -n))

  const parcelaCentavos = Math.round(parcela)
  const totalCentavos = i === 0 ? v : Math.round(parcela * n)
  const lista: ParcelaSimulada[] = []
  let acumulado = 0
  for (let k = 0; k < n; k++) {
    const valor = k === n - 1 ? totalCentavos - acumulado : parcelaCentavos
    acumulado += valor
    lista.push({ numero: k + 1, vencimento: vencimento(p.primeiroVencimento, k, p.diaVencimento), valorCentavos: valor })
  }
  return { parcelas: lista, totalCentavos, jurosCentavos: totalCentavos - v, parcelaCentavos }
}

/** Valor por extenso (reais e centavos) para a promissória. */
export function valorPorExtenso(c: Centavos): string {
  const un = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
  const dez = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
  const cem = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']
  const ate999 = (n: number): string => {
    if (n === 0) return ''
    if (n === 100) return 'cem'
    const partes: string[] = []
    const c = Math.floor(n / 100), r = n % 100
    if (c) partes.push(cem[c])
    if (r < 20) { if (r) partes.push(un[r]) }
    else { partes.push(dez[Math.floor(r / 10)] + (r % 10 ? ' e ' + un[r % 10] : '')) }
    return partes.join(' e ')
  }
  const reais = Math.floor(c / 100), cent = c % 100
  const mil = Math.floor(reais / 1000), resto = reais % 1000
  const txt: string[] = []
  if (mil) txt.push(mil === 1 ? 'mil' : ate999(mil) + ' mil')
  if (resto) txt.push(ate999(resto))
  let r = txt.join(mil && resto && (resto < 100 || resto % 100 === 0) ? ' e ' : ' ')
  if (reais) r += reais === 1 ? ' real' : ' reais'
  if (cent) r += (reais ? ' e ' : '') + ate999(cent) + (cent === 1 ? ' centavo' : ' centavos')
  return r || 'zero reais'
}
