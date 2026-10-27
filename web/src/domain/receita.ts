// Regras de receita óptica — ver docs/regras-de-negocio.md §1

export type Dioptria = number | null

export interface Olho {
  esf: Dioptria
  cil: Dioptria
  eixo: number | null
}

export interface Receita {
  longe: { od: Olho; oe: Olho }
  perto: { od: Olho; oe: Olho }
  adicao: Dioptria
  dnp: { od: number | null; oe: number | null }
  altura: { od: number | null; oe: number | null }
  armacao: {
    tipo: string
    horizontal: number | null
    vertical: number | null
    diagonal: number | null
    ponte: number | null
  }
  observacoes: string
  lidaPorIa: boolean
  conferida: boolean
}

export const olhoVazio = (): Olho => ({ esf: null, cil: null, eixo: null })

export const receitaVazia = (): Receita => ({
  longe: { od: olhoVazio(), oe: olhoVazio() },
  perto: { od: olhoVazio(), oe: olhoVazio() },
  adicao: null,
  dnp: { od: null, oe: null },
  altura: { od: null, oe: null },
  armacao: { tipo: '', horizontal: null, vertical: null, diagonal: null, ponte: null },
  observacoes: '',
  lidaPorIa: false,
  conferida: true,
})

export const arredondarPasso = (v: number, passo = 0.25) =>
  Math.round(Math.round(v / passo) * passo * 100) / 100

/** Aceita "-1,25", "+2.5", "plano", "" */
export function parseDioptria(txt: string): Dioptria {
  const t = txt.trim().toLowerCase()
  if (t === '') return null
  if (t === 'plano' || t === 'pl') return 0
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? arredondarPasso(n) : null
}

export function formatarDioptria(v: Dioptria): string {
  if (v === null || v === undefined) return ''
  if (v === 0) return 'Plano'
  const s = Math.abs(v).toFixed(2).replace('.', ',')
  return (v > 0 ? '+' : '-') + s
}

/** Esférico perto = esférico longe + adição; cilindro e eixo repetidos. */
export function calcularPerto(longe: Olho, adicao: Dioptria): Olho {
  if (adicao === null || longe.esf === null) return { ...longe }
  return {
    esf: arredondarPasso(longe.esf + adicao),
    cil: longe.cil,
    eixo: longe.eixo,
  }
}

/** Converte entre convenção de cilindro positivo e negativo. */
export function transporCilindro(o: Olho): Olho {
  if (o.cil === null || o.cil === 0 || o.esf === null) return { ...o }
  const eixo = o.eixo === null ? null : o.eixo <= 90 ? o.eixo + 90 : o.eixo - 90
  return { esf: arredondarPasso(o.esf + o.cil), cil: arredondarPasso(-o.cil), eixo }
}

export const equivalenteEsferico = (o: Olho) =>
  o.esf === null ? null : arredondarPasso(o.esf + (o.cil ?? 0) / 2, 0.125)

/** Maior poder absoluto entre os dois meridianos de um olho. */
export function maiorMeridiano(o: Olho): number {
  if (o.esf === null) return 0
  return Math.max(Math.abs(o.esf), Math.abs(o.esf + (o.cil ?? 0)))
}

/** Meridiano de maior valor absoluto entre os dois olhos, com sinal (usado no simulador de espessura). */
export function meridianoCritico(...olhos: Olho[]): number {
  let melhor = 0
  for (const o of olhos) {
    if (o.esf === null) continue
    for (const m of [o.esf, o.esf + (o.cil ?? 0)]) if (Math.abs(m) > Math.abs(melhor)) melhor = m
  }
  return arredondarPasso(melhor)
}

export function sugerirIndice(r: Receita): { indice: number; motivo: string } {
  const m = Math.max(maiorMeridiano(r.longe.od), maiorMeridiano(r.longe.oe))
  if (m <= 2) return { indice: 1.56, motivo: 'grau baixo (até 2,00)' }
  if (m <= 4) return { indice: 1.59, motivo: 'grau moderado (2,25 a 4,00)' }
  if (m <= 6) return { indice: 1.67, motivo: 'grau alto (4,25 a 6,00)' }
  return { indice: 1.74, motivo: 'grau muito alto (acima de 6,00)' }
}

export type ErrosReceita = Record<string, string>

function noPasso(v: number, passo = 0.25) {
  return Math.abs(v / passo - Math.round(v / passo)) < 1e-9
}

export function validarReceita(r: Receita): ErrosReceita {
  const e: ErrosReceita = {}
  const olhos = [
    ['longe.od', r.longe.od],
    ['longe.oe', r.longe.oe],
  ] as const
  for (const [k, o] of olhos) {
    if (o.esf !== null && (o.esf < -30 || o.esf > 30 || !noPasso(o.esf))) e[`${k}.esf`] = 'Esférico fora da faixa ou do passo 0,25'
    if (o.cil !== null && (o.cil < -10 || o.cil > 10 || !noPasso(o.cil))) e[`${k}.cil`] = 'Cilindro fora da faixa ou do passo 0,25'
    if (o.cil && o.eixo === null) e[`${k}.eixo`] = 'Informe o eixo'
    if (o.eixo !== null && (o.eixo < 0 || o.eixo > 180)) e[`${k}.eixo`] = 'Eixo entre 0 e 180'
  }
  if (r.adicao !== null && (r.adicao < 0.75 || r.adicao > 4 || !noPasso(r.adicao))) e['adicao'] = 'Adição entre +0,75 e +4,00'
  for (const lado of ['od', 'oe'] as const) {
    const d = r.dnp[lado]
    if (d !== null && (d < 25 || d > 40)) e[`dnp.${lado}`] = 'DNP entre 25 e 40 mm'
    const a = r.altura[lado]
    if (a !== null && (a < 10 || a > 35)) e[`altura.${lado}`] = 'Altura entre 10 e 35 mm'
  }
  return e
}
