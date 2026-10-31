// Provador virtual: tamanho e posição da armação na selfie. Regras puras, sem DOM.
// A imagem do provador tem a largura da frente da armação (2 × lente + ponte + 10 mm de pontas).

export interface Ponto { x: number; y: number }
/** posição em pixels da foto original: centro, largura da armação e inclinação em graus */
export interface Posicao { cx: number; cy: number; largura: number; angulo: number }

/** Distância média entre as pupilas de um adulto, em mm (usada para achar a escala da foto) */
export const DP_MEDIA_MM = 63
export const LARGURA_PADRAO_MM = 135

/** "BB90169 55-18" ou "55□18-144" → 2 × 55 + 18 + 10 = 138 mm */
export function larguraArmacaoMm(codigo?: string | null): number {
  const m = /(\d{2})\s*[-□xX/]\s*(\d{2})/.exec(codigo ?? '')
  if (!m) return LARGURA_PADRAO_MM
  const lente = Number(m[1]), ponte = Number(m[2])
  if (lente < 38 || lente > 70 || ponte < 10 || ponte > 28) return LARGURA_PADRAO_MM
  return 2 * lente + ponte + 10
}

/** Posiciona pela posição dos olhos: escala pela distância entre pupilas */
export function posicionarPelosOlhos(a: Ponto, b: Ponto, larguraMm: number, dpMm = DP_MEDIA_MM): Posicao {
  const [e, d] = a.x <= b.x ? [a, b] : [b, a]
  const dist = Math.hypot(d.x - e.x, d.y - e.y)
  const pxPorMm = dist / dpMm
  const largura = larguraMm * pxPorMm
  const angulo = (Math.atan2(d.y - e.y, d.x - e.x) * 180) / Math.PI
  return { cx: (e.x + d.x) / 2, cy: (e.y + d.y) / 2 + largura * 0.02, largura, angulo }
}

/** Sem detecção do rosto: chute razoável para selfie de frente */
export const posicaoPadrao = (larguraFoto: number, alturaFoto: number): Posicao =>
  ({ cx: larguraFoto / 2, cy: alturaFoto * 0.42, largura: larguraFoto * 0.6, angulo: 0 })

/** Troca de armação mantendo a escala do rosto (px por mm) */
export const trocarArmacao = (p: Posicao, mmAtual: number, mmNova: number): Posicao =>
  ({ ...p, largura: (p.largura / mmAtual) * mmNova })

/** Gesto de pinça: escala e giro a partir de dois dedos (antes e agora) */
export function aplicarPinca(p: Posicao, antes: [Ponto, Ponto], agora: [Ponto, Ponto], escalaTela: number): Posicao {
  const dist = (q: [Ponto, Ponto]) => Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y)
  const ang = (q: [Ponto, Ponto]) => Math.atan2(q[1].y - q[0].y, q[1].x - q[0].x)
  const meio = (q: [Ponto, Ponto]) => ({ x: (q[0].x + q[1].x) / 2, y: (q[0].y + q[1].y) / 2 })
  const k = dist(agora) / Math.max(1, dist(antes))
  const m0 = meio(antes), m1 = meio(agora)
  return {
    cx: p.cx + (m1.x - m0.x) / escalaTela,
    cy: p.cy + (m1.y - m0.y) / escalaTela,
    largura: Math.max(20, p.largura * k),
    angulo: p.angulo + ((ang(agora) - ang(antes)) * 180) / Math.PI,
  }
}
