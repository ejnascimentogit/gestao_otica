// Estimativa de espessura de lente (aproximação didática para o simulador de venda).
// Usa a sagitta de uma superfície esférica: s = r − √(r² − (d/2)²), com r = (n − 1)·1000 / |P|.
// Não substitui o cálculo do laboratório.

export interface Espessura { centro: number; borda: number }

export function estimarEspessura(poder: number, indice: number, diametro = 60): Espessura {
  const minCentroNegativa = 1.8
  const minBordaPositiva = 1.0
  if (poder === 0) return { centro: 2, borda: 2 }
  const r = ((indice - 1) * 1000) / Math.abs(poder)
  const h = diametro / 2
  const sag = r > h ? r - Math.sqrt(r * r - h * h) : h
  return poder < 0
    ? { centro: minCentroNegativa, borda: +(minCentroNegativa + sag).toFixed(1) }
    : { centro: +(minBordaPositiva + sag).toFixed(1), borda: minBordaPositiva }
}

/** Diâmetro mínimo de lente bruta a partir da armação: DM + 2·descentração + 2 mm. */
export function diametroMinimo(horizontal: number, ponte: number, dnp: number, diagonal?: number): number {
  const dpArmacao = (horizontal + ponte) / 2
  const descentracao = Math.abs(dpArmacao - dnp)
  return Math.ceil((diagonal ?? horizontal + 4) + 2 * descentracao + 2)
}

export const INDICES = [1.5, 1.56, 1.59, 1.67, 1.74]
