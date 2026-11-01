// Quadro para assinar com o dedo ou o mouse. O desenho usa o dobro de pontos para ficar nítido.
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface AssinaturaRef {
  limpar: () => void
  temTraco: () => boolean
  png: () => Promise<Blob | null>
  dataUrl: () => string
}

export const QuadroAssinatura = forwardRef<AssinaturaRef, { altura?: number }>(function QuadroAssinatura({ altura = 220 }, ref) {
  const cv = useRef<HTMLCanvasElement>(null)
  const tem = useRef(false)
  const desenhando = useRef(false)

  const preparar = () => {
    const c = cv.current; if (!c) return
    const b = c.getBoundingClientRect(); if (!b.width) return
    c.width = Math.round(b.width * 2); c.height = Math.round(b.height * 2)
    const ctx = c.getContext('2d')!
    ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1d3b6f'
    tem.current = false
  }
  useEffect(() => { preparar() }, [])

  useImperativeHandle(ref, () => ({
    limpar: preparar,
    temTraco: () => tem.current,
    png: () => new Promise(ok => cv.current ? cv.current.toBlob(ok, 'image/png') : ok(null)),
    dataUrl: () => cv.current?.toDataURL('image/png') ?? '',
  }))

  const pos = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const c = cv.current!, r = c.getBoundingClientRect()
    return [((ev.clientX - r.left) * c.width) / r.width, ((ev.clientY - r.top) * c.height) / r.height] as const
  }

  return (
    <canvas ref={cv} className="quadro-assinatura" style={{ height: altura }}
      onPointerDown={ev => {
        desenhando.current = true; ev.currentTarget.setPointerCapture(ev.pointerId)
        const ctx = cv.current!.getContext('2d')!, [x, y] = pos(ev)
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke(); tem.current = true
      }}
      onPointerMove={ev => {
        if (!desenhando.current) return
        const ctx = cv.current!.getContext('2d')!, [x, y] = pos(ev)
        ctx.lineTo(x, y); ctx.stroke()
      }}
      onPointerUp={() => { desenhando.current = false }}
      onPointerCancel={() => { desenhando.current = false }} />
  )
})
