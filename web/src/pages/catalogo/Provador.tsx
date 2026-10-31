// Provador virtual: o cliente tira uma selfie e vê as armações no rosto.
// Tudo acontece no aparelho dele: a foto não é enviada para lugar nenhum.
import { useEffect, useRef, useState } from 'react'
import { Botao } from '../../components/ui'
import { formatarMoeda } from '../../domain/formatos'
import {
  aplicarPinca, larguraArmacaoMm, posicaoPadrao, posicionarPelosOlhos, trocarArmacao, type Ponto, type Posicao,
} from '../../domain/provador'
import { reduzirImagem } from '../../lib/imagem'
import { detectarOlhos, prepararDeteccao } from '../../lib/rosto'
import type { ProdutoPublico } from '../../data/store'

type Estado = 'foto' | 'procurando' | 'pronto'

export function Provador({ produtos, inicial, nomeLoja, aoFechar, aoInteresse }: {
  produtos: ProdutoPublico[]
  inicial: ProdutoPublico
  nomeLoja: string
  aoFechar: () => void
  aoInteresse: (p: ProdutoPublico) => void
}) {
  const [atual, setAtual] = useState(inicial)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [estado, setEstado] = useState<Estado>('foto')
  const [achouOlhos, setAchouOlhos] = useState(false)
  const [pos, setPos] = useState<Posicao | null>(null)
  const [escala, setEscala] = useState(1) // px na tela por px da foto
  const [erro, setErro] = useState('')
  const imgRef = useRef<HTMLImageElement>(null)
  const palco = useRef<HTMLDivElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const galeria = useRef<HTMLInputElement>(null)
  const toques = useRef(new Map<number, Ponto>())
  const antes = useRef<{ pos: Posicao; pts: Ponto[] } | null>(null)

  useEffect(() => { prepararDeteccao() }, [])
  useEffect(() => () => { if (fotoUrl) URL.revokeObjectURL(fotoUrl) }, [fotoUrl])
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar() }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [aoFechar])

  // escala da tela: atualiza quando a foto carrega ou a janela muda
  useEffect(() => {
    const medir = () => { const i = imgRef.current; if (i?.naturalWidth) setEscala(i.clientWidth / i.naturalWidth) }
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

  async function escolheu(arquivo?: File) {
    if (!arquivo) return
    setErro('')
    try {
      const blob = await reduzirImagem(arquivo, 1280, 0.9)
      setFotoUrl(URL.createObjectURL(blob))
      setEstado('procurando')
      setPos(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível abrir a foto.')
    }
  }

  async function fotoCarregou() {
    const i = imgRef.current!
    setEscala(i.clientWidth / i.naturalWidth)
    const olhos = await detectarOlhos(i)
    const mm = larguraArmacaoMm(atual.codigo)
    if (olhos) { setPos(posicionarPelosOlhos(olhos[0], olhos[1], mm)); setAchouOlhos(true) }
    else { setPos(posicaoPadrao(i.naturalWidth, i.naturalHeight)); setAchouOlhos(false) }
    setEstado('pronto')
  }

  function trocar(p: ProdutoPublico) {
    if (pos) setPos(trocarArmacao(pos, larguraArmacaoMm(atual.codigo), larguraArmacaoMm(p.codigo)))
    setAtual(p)
  }

  // gestos: 1 dedo arrasta, 2 dedos aumentam/diminuem e giram
  const ponto = (e: React.PointerEvent): Ponto => ({ x: e.clientX, y: e.clientY })
  function down(e: React.PointerEvent) {
    if (!pos) return
    e.currentTarget.setPointerCapture(e.pointerId)
    toques.current.set(e.pointerId, ponto(e))
    antes.current = { pos, pts: [...toques.current.values()] }
  }
  function move(e: React.PointerEvent) {
    if (!toques.current.has(e.pointerId) || !antes.current) return
    toques.current.set(e.pointerId, ponto(e))
    const pts = [...toques.current.values()], a = antes.current
    if (pts.length >= 2 && a.pts.length >= 2) {
      setPos(aplicarPinca(a.pos, [a.pts[0], a.pts[1]], [pts[0], pts[1]], escala))
    } else if (pts.length === 1 && a.pts.length === 1) {
      setPos({ ...a.pos, cx: a.pos.cx + (pts[0].x - a.pts[0].x) / escala, cy: a.pos.cy + (pts[0].y - a.pts[0].y) / escala })
    }
  }
  function up(e: React.PointerEvent) {
    toques.current.delete(e.pointerId)
    antes.current = pos ? { pos, pts: [...toques.current.values()] } : null
  }

  async function salvarFoto() {
    const foto = imgRef.current
    if (!foto || !pos) return
    try {
      const arm = new Image()
      arm.crossOrigin = 'anonymous'
      await new Promise<void>((ok, falha) => { arm.onload = () => ok(); arm.onerror = () => falha(new Error('armação')); arm.src = atual.provadorUrl! })
      const cv = document.createElement('canvas')
      cv.width = foto.naturalWidth; cv.height = foto.naturalHeight
      const ctx = cv.getContext('2d')!
      ctx.drawImage(foto, 0, 0)
      const altura = pos.largura * (arm.naturalHeight / arm.naturalWidth || 0.4)
      ctx.translate(pos.cx, pos.cy)
      ctx.rotate((pos.angulo * Math.PI) / 180)
      ctx.drawImage(arm, -pos.largura / 2, -altura / 2, pos.largura, altura)
      const blob = await new Promise<Blob | null>(ok => cv.toBlob(ok, 'image/jpeg', 0.9))
      if (!blob) throw new Error('imagem')
      const nome = `provador-${atual.descricao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}.jpg`
      const arquivo = new File([blob], nome, { type: 'image/jpeg' })
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
      if (nav.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: atual.descricao, text: `Provando ${atual.descricao} na ${nomeLoja}` })
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob); a.download = nome; a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 2000)
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setErro('Não foi possível salvar a foto neste aparelho.')
    }
  }

  const ajustar = (p: Partial<Posicao>) => pos && setPos({ ...pos, ...p })
  const comProvador = produtos.filter(p => p.provadorUrl)

  return (
    <div className="prov" role="dialog" aria-label="Provador virtual">
      <div className="prov-topo">
        <b>Provador virtual</b>
        <Botao pequeno variante="fantasma" onClick={aoFechar}>Fechar</Botao>
      </div>

      <input ref={camera} type="file" accept="image/*" capture="user" hidden onChange={e => { escolheu(e.target.files?.[0]); e.target.value = '' }} />
      <input ref={galeria} type="file" accept="image/*" hidden onChange={e => { escolheu(e.target.files?.[0]); e.target.value = '' }} />

      {!fotoUrl ? (
        <div className="prov-inicio">
          <div className="prov-amostra"><img src={atual.provadorUrl} alt="" /></div>
          <h2>Veja como fica em você</h2>
          <p className="muted">Tire uma selfie de frente, com boa luz e <b>sem óculos</b>. Depois é só tocar nas armações para trocar.</p>
          <div className="prov-acoes">
            <Botao variante="primario" onClick={() => camera.current?.click()}>Tirar selfie</Botao>
            <Botao onClick={() => galeria.current?.click()}>Escolher da galeria</Botao>
          </div>
          <p className="fraco">A foto fica só no seu celular. Não é enviada nem guardada.</p>
          {erro && <p style={{ color: 'var(--erro)' }}>{erro}</p>}
        </div>
      ) : (
        <>
          <div className="prov-palco" ref={palco}>
            <div className="prov-foto" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
              <img ref={imgRef} src={fotoUrl} alt="Sua foto" onLoad={fotoCarregou} draggable={false} />
              {pos && atual.provadorUrl && (
                <img className="prov-armacao" src={atual.provadorUrl} alt={atual.descricao} draggable={false} crossOrigin="anonymous"
                  style={{ left: pos.cx * escala, top: pos.cy * escala, width: pos.largura * escala, transform: `translate(-50%, -50%) rotate(${pos.angulo}deg)` }} />
              )}
              {estado === 'procurando' && <div className="prov-aviso">Procurando seus olhos…</div>}
            </div>
          </div>

          <div className="prov-painel">
            <div className="prov-info">
              <div style={{ minWidth: 0 }}>
                <b>{atual.descricao}</b>
                <div className="muted">{atual.preco > 0 ? formatarMoeda(atual.preco) : 'Consulte o preço'}</div>
              </div>
              <span className="fraco" style={{ textAlign: 'right' }}>
                {estado === 'pronto' ? (achouOlhos ? 'Posicionado pelos seus olhos. Ajuste com o dedo se precisar.' : 'Arraste e use dois dedos para ajustar o tamanho.') : ''}
              </span>
            </div>

            {pos && (
              <div className="prov-ajustes">
                <label>Tamanho
                  <input type="range" min={20} max={300} value={Math.round((pos.largura / (imgRef.current?.naturalWidth || 1)) * 200)}
                    onChange={e => ajustar({ largura: (Number(e.target.value) / 200) * (imgRef.current?.naturalWidth || 1) })} />
                </label>
                <label>Inclinação
                  <input type="range" min={-25} max={25} step={0.5} value={pos.angulo} onChange={e => ajustar({ angulo: Number(e.target.value) })} />
                </label>
              </div>
            )}

            {comProvador.length > 1 && (
              <div className="prov-lista" aria-label="Outras armações">
                {comProvador.map(p => (
                  <button key={p.id} type="button" className="prov-item" aria-pressed={p.id === atual.id} onClick={() => trocar(p)} title={p.descricao}>
                    <img src={p.provadorUrl} alt={p.descricao} />
                  </button>
                ))}
              </div>
            )}

            {erro && <p style={{ color: 'var(--erro)', margin: 0 }}>{erro}</p>}
            <div className="prov-acoes">
              <Botao onClick={() => camera.current?.click()}>Nova foto</Botao>
              <Botao onClick={salvarFoto} disabled={!pos}>Salvar foto</Botao>
              <Botao variante="primario" onClick={() => aoInteresse(atual)}>Tenho interesse</Botao>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
