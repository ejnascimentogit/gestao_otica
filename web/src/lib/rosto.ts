// Acha os olhos na selfie, no próprio aparelho (MediaPipe Face Landmarker).
// O código vem no pacote do app; o motor (wasm) e o modelo são baixados na primeira vez
// pelo navegador de quem usa. A foto nunca sai do aparelho. Se algo falhar, devolve null
// e o provador segue com ajuste manual.
import type { Ponto } from '../domain/provador'

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODELO = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

type Detector = { detect: (img: HTMLImageElement) => { faceLandmarks: { x: number; y: number }[][] } }
let detector: Promise<Detector | null> | null = null

function carregar(): Promise<Detector | null> {
  if (!detector) {
    detector = (async () => {
      try {
        const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision')
        const arquivos = await FilesetResolver.forVisionTasks(WASM)
        return await FaceLandmarker.createFromOptions(arquivos, {
          baseOptions: { modelAssetPath: MODELO, delegate: 'CPU' },
          runningMode: 'IMAGE', numFaces: 1,
        }) as unknown as Detector
      } catch {
        detector = null // tenta de novo na próxima foto
        return null
      }
    })()
  }
  return detector
}

/** Pré-carrega quando a pessoa abre o provador, para a detecção ser rápida depois da foto */
export const prepararDeteccao = () => { void carregar() }

const media = (pts: { x: number; y: number }[]) => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
})

/** Centro dos dois olhos em pixels da imagem, ou null */
export async function detectarOlhos(img: HTMLImageElement, limiteMs = 20000): Promise<[Ponto, Ponto] | null> {
  const tempo = new Promise<null>(ok => setTimeout(() => ok(null), limiteMs))
  const d = await Promise.race([carregar(), tempo])
  if (!d) return null
  try {
    const r = d.detect(img)
    const lm = r.faceLandmarks?.[0]
    if (!lm || lm.length < 400) return null
    const W = img.naturalWidth, H = img.naturalHeight
    // íris (468 e 473) quando o modelo traz; senão, média dos cantos dos olhos
    const a = lm.length >= 478 ? lm[468] : media([lm[33], lm[133]])
    const b = lm.length >= 478 ? lm[473] : media([lm[362], lm[263]])
    return [{ x: a.x * W, y: a.y * H }, { x: b.x * W, y: b.y * H }]
  } catch {
    return null
  }
}
