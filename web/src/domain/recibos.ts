// Recibos de pagamento (trazidos do Taskfull). Regras puras: valor por extenso, parcelas,
// descrição do pagamento, documento (CPF/CNPJ) e o texto usado no código de autenticidade.
import { formatarMoeda, type Centavos } from './formatos'

export type FormaRecibo = 'pix' | 'dinheiro' | 'debito' | 'credito_vista' | 'credito_parcelado' | 'crediario_loja' | 'transferencia'

export const FORMAS_RECIBO: Record<FormaRecibo, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  debito: 'Cartão de débito',
  credito_vista: 'Cartão de crédito à vista',
  credito_parcelado: 'Cartão de crédito parcelado',
  crediario_loja: 'Crediário da loja',
  transferencia: 'Transferência bancária',
}
export const FORMA_CURTA_RECIBO: Record<FormaRecibo, string> = {
  pix: 'Pix', dinheiro: 'Dinheiro', debito: 'Débito', credito_vista: 'Crédito à vista',
  credito_parcelado: 'Crédito', crediario_loja: 'Crediário', transferencia: 'Transferência',
}
export const formaParcelada = (f: FormaRecibo) => f === 'credito_parcelado' || f === 'crediario_loja'

const moeda = (c: Centavos) => formatarMoeda(c).replace(/\s/g, ' ')

// ---------- valor por extenso ----------
const UN = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const DZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CT = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']
function ate999(n: number): string {
  if (n === 100) return 'cem'
  const s: string[] = [], c = Math.floor(n / 100), r = n % 100
  if (c) s.push(CT[c])
  if (r) {
    if (r < 20) s.push(UN[r])
    else { const d = Math.floor(r / 10), u = r % 10; s.push(DZ[d] + (u ? ' e ' + UN[u] : '')) }
  }
  return s.join(' e ')
}
/** 1234,56 → "mil duzentos e trinta e quatro reais e cinquenta e seis centavos" */
export function valorPorExtenso(centavos: Centavos): string {
  const c = Math.round(centavos), reais = Math.floor(c / 100), cent = c % 100
  const milhoes = Math.floor(reais / 1_000_000), resto = reais % 1_000_000, mil = Math.floor(resto / 1000), r = resto % 1000
  const partes: string[] = []
  if (milhoes) partes.push(milhoes === 1 ? 'um milhão' : ate999(milhoes) + ' milhões')
  if (mil) partes.push(mil === 1 ? 'mil' : ate999(mil) + ' mil')
  if (r) partes.push((partes.length && (r < 100 || r % 100 === 0) ? 'e ' : '') + ate999(r))
  let texto = partes.length ? partes.join(' ') : 'zero'
  if (reais >= 1_000_000 && !resto) texto += ' de'
  let out = reais === 0 && cent ? '' : texto + (reais === 1 ? ' real' : ' reais')
  if (cent) out += (out ? ' e ' : '') + ate999(cent) + (cent === 1 ? ' centavo' : ' centavos')
  return out
}

// ---------- parcelas ----------
export function somarMeses(iso: string, n: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  const alvo = new Date(a, m - 1 + n, 1)
  const ult = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(Math.min(d, ult)).padStart(2, '0')}`
}
export interface ParcelaRecibo { n: number; vencimento: string; valor: Centavos }
/** Divide em n parcelas mensais; a última absorve os centavos que sobram */
export function calcularParcelas(total: Centavos, n: number, primeira: string): ParcelaRecibo[] {
  const base = Math.floor(total / n), sobra = total - base * n
  return Array.from({ length: n }, (_, i) => ({ n: i + 1, vencimento: somarMeses(primeira, i), valor: i === n - 1 ? base + sobra : base }))
}

export function descricaoPagamento(r: { forma: FormaRecibo; valor: Centavos; parcelas: number; primeiraParcela?: string | null; dataEmissao: string }): string {
  if (!formaParcelada(r.forma)) return FORMAS_RECIBO[r.forma]
  const p = calcularParcelas(r.valor, r.parcelas, r.primeiraParcela || r.dataEmissao)
  const uns = p[0].valor, ult = p[p.length - 1].valor
  const nome = r.forma === 'crediario_loja' ? 'Crediário da loja' : 'Cartão de crédito parcelado'
  return `${nome} em ${r.parcelas}× de ${moeda(uns)}${ult !== uns ? ` (última parcela ${moeda(ult)})` : ''}`
}

export const numeroRecibo = (n: number) => String(n).padStart(4, '0')

// ---------- CPF / CNPJ ----------
export const soDigitos = (s: string) => (s ?? '').replace(/\D/g, '')
export function cpfValido(c: string): boolean {
  const d = soDigitos(c)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const dv = (n: number) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10])
}
export function cnpjValido(c: string): boolean {
  const d = soDigitos(c)
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false
  const calc = (n: number) => { const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; const s = pesos.reduce((a, p, i) => a + p * Number(d[i]), 0); const r = s % 11; return r < 2 ? 0 : 11 - r }
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13])
}
export function formatarDocumento(doc: string): string {
  const d = soDigitos(doc)
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  return doc ?? ''
}
/** Máscara enquanto digita: até 11 dígitos CPF, depois CNPJ */
export function mascararDocumento(txt: string): string {
  const d = soDigitos(txt).slice(0, 14)
  if (d.length <= 11) return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}
export const documentoOk = (doc: string) => { const d = soDigitos(doc); return d === '' || (d.length === 11 ? cpfValido(d) : d.length === 14 && cnpjValido(d)) }

// ---------- código de autenticidade (SHA-256) ----------
/** Mesmo texto que a função recibo_verificar monta no banco (a ordem e o formato precisam bater) */
export function textoAutenticidade(r: {
  id: string; numero: number; codigo: string; data_emissao: string; cliente_nome: string; cliente_documento: string
  valor: number; forma_pagamento: string; parcelas: number; primeira_parcela: string | null; emissor_documento: string; created_at: string
}): string {
  return [r.id, r.numero, r.codigo, r.data_emissao, r.cliente_nome, r.cliente_documento, String(Number(r.valor)), r.forma_pagamento,
    r.parcelas, r.primeira_parcela || '', r.emissor_documento, r.created_at].join('|')
}

export interface ErrosRecibo { [campo: string]: string }
export function validarRecibo(r: { cliente: string; documento: string; valor: Centavos; forma: FormaRecibo; primeiraParcela?: string | null }): ErrosRecibo {
  const e: ErrosRecibo = {}
  if (!r.cliente.trim()) e.cliente = 'Informe o nome do cliente.'
  if (!(r.valor > 0)) e.valor = 'Informe o valor do recibo.'
  if (!documentoOk(r.documento)) e.documento = 'CPF/CNPJ inválido. Confira ou deixe em branco.'
  if (formaParcelada(r.forma) && !r.primeiraParcela) e.primeira = 'Informe o vencimento da primeira parcela.'
  return e
}
