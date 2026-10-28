// Aparência (modo escuro, contornos) e Estúdio de Temas. Preferência pessoal, salva no navegador.
import { useEffect, useRef, useState } from 'react'
import { Botao, Modal } from './ui'
import {
  TEMAS, CLIMAS, HARMONIAS, CONTORNO_PADRAO, gerarTema, hex, hsl, testarContraste, pontosHarmonia, temaEhPadrao,
  type Tema, type Harmonia, type Clima,
} from '../domain/temas'
import {
  aplicarTema, aplicarContorno, contornoSalvo, definirModoEscuro, escuroAtivo, temaSalvo, temasMeus, guardarTemasMeus,
} from '../lib/aparencia'

function Mini({ p }: { p: Tema }) {
  const t = gerarTema(p, false)
  return (
    <span className="et-mini" aria-hidden>
      <i style={{ background: hex(t.lateral), borderRight: `1px solid ${hex(t.borda)}` }} />
      <span style={{ background: hex(t.papel) }}>
        <b style={{ background: hex(t.marca) }} />
        <s style={{ background: hex(t.acento) }} />
      </span>
    </span>
  )
}

const nomeDoTema = (p: Tema) => p.nome || TEMAS.find(x => x.id === p.id)?.nome || 'Personalizado'

export function Aparencia({ aoFechar }: { aoFechar: () => void }) {
  const [escuro, setEscuro] = useState(escuroAtivo)
  const [contorno, setContorno] = useState(contornoSalvo)
  const [tema, setTema] = useState(temaSalvo)
  const [estudio, setEstudio] = useState(false)

  const mudarContorno = (v: number) => { setContorno(v); aplicarContorno(v, true) }

  if (estudio) return <EstudioTemas aoFechar={() => { setEstudio(false); setTema(temaSalvo()) }} />

  return (
    <Modal titulo="Aparência" aoFechar={aoFechar}>
      <div style={{ display: 'grid', gap: 18 }}>
        <p className="fraco" style={{ margin: 0 }}>Vale só para você, neste aparelho.</p>

        <button type="button" className="ap-tema" onClick={() => setEstudio(true)}>
          <Mini p={tema} />
          <span style={{ flex: 1, textAlign: 'left' }}>
            <b>🎨 Temas e cores</b>
            <span className="fraco" style={{ display: 'block' }}>{nomeDoTema(tema)}</span>
          </span>
          <span aria-hidden>›</span>
        </button>

        <label className="ap-linha">
          <span style={{ flex: 1 }}><b>🌙 Modo escuro</b></span>
          <input type="checkbox" className="ap-chave" checked={escuro}
            onChange={e => { setEscuro(e.target.checked); definirModoEscuro(e.target.checked) }} />
        </label>

        <div style={{ display: 'grid', gap: 6 }}>
          <div className="linha">
            <b style={{ flex: 1 }}>Linhas e contornos</b>
            <span className="fraco">{contorno}</span>
            {contorno !== CONTORNO_PADRAO && <Botao pequeno variante="fantasma" onClick={() => mudarContorno(CONTORNO_PADRAO)}>↺ Padrão</Botao>}
          </div>
          <div className="linha" style={{ gap: 8, flexWrap: 'nowrap' }}>
            <span className="fraco">Suave</span>
            <input type="range" min={0} max={100} value={contorno} style={{ flex: 1 }} aria-label="Intensidade das linhas"
              onChange={e => mudarContorno(Number(e.target.value))} />
            <span className="fraco">Forte</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ---------------- Estúdio de Temas ----------------
// As mudanças aparecem na hora e só ficam se a pessoa clicar em Aplicar.
export function EstudioTemas({ aoFechar }: { aoFechar: () => void }) {
  const antes = useRef(temaSalvo())
  const [p, setP] = useState<Tema>(() => ({ ...antes.current }))
  const [clima, setClima] = useState<Clima | 'todos'>('todos')
  const [meus, setMeus] = useState(temasMeus)
  const [nomeMeu, setNomeMeu] = useState('')
  const [aviso, setAviso] = useState('')
  const [escuro] = useState(escuroAtivo)
  const roda = useRef<HTMLDivElement>(null)
  const arrastando = useRef(false)

  useEffect(() => { aplicarTema(p) }, [p])

  const cancelar = () => { aplicarTema(antes.current); aoFechar() }
  const aplicar = () => { aplicarTema(p, true); aoFechar() }

  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelar() }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  // mexer à mão vira tema "livre"
  const manual = (mudar: Partial<Tema>) => setP(x => {
    const n: Tema = { ...x, ...mudar, id: 'livre', nome: '' }
    delete n.accHex; delete n.especial; delete n.finoDest
    return n
  })

  const anguloDe = (ev: { clientX: number; clientY: number }) => {
    const r = roda.current!.getBoundingClientRect()
    const x = ev.clientX - (r.left + r.width / 2), y = ev.clientY - (r.top + r.height / 2)
    return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360)
  }

  const lista = TEMAS.filter(t => clima === 'todos' || t.clima.includes(clima))
  const atual = gerarTema(p, escuro)
  const pares = testarContraste(p, escuro)
  const falhas = pares.filter(x => !x.ok).length

  // pontos no círculo
  const C = 100, R = 80
  const pt = (deg: number): [number, number] => { const a = ((deg - 90) * Math.PI) / 180; return [C + R * Math.cos(a), C + R * Math.sin(a)] }
  const graus = pontosHarmonia(p)
  const xs = graus.map(pt)

  const guardarMeu = () => {
    const nome = nomeMeu.trim()
    if (!nome) { setAviso('Dê um nome ao seu tema.'); return }
    const { id: _id, desc: _d, clima: _c, ...resto } = p
    const novo: Tema = { ...resto, id: 'meu', nome, clima: ['todos'] }
    const lista2 = [...meus, novo]
    if (!guardarTemasMeus(lista2)) { setAviso('Não foi possível guardar neste navegador.'); return }
    setMeus(lista2); setNomeMeu(''); setAviso(`Tema "${nome}" guardado.`)
    setP({ ...novo, id: `u${lista2.length - 1}` })
  }
  const apagarMeu = (i: number) => { const l = meus.filter((_, j) => j !== i); guardarTemasMeus(l); setMeus(l) }

  return (
    <div className="et-fundo" onMouseDown={e => e.target === e.currentTarget && cancelar()}>
      <aside className="et-painel" role="dialog" aria-label="Temas e cores">
        <div className="et-topo">
          <b style={{ fontSize: 16 }}>🎨 Temas e cores</b>
          <Botao pequeno variante="fantasma" onClick={cancelar} autoFocus>Fechar</Botao>
        </div>

        <div className="et-corpo">
          <section>
            <div className="chips">
              {CLIMAS.map(([id, rot]) => (
                <button key={id} type="button" className={`chip ${clima === id ? 'ativo' : ''}`} aria-pressed={clima === id} onClick={() => setClima(id)}>{rot}</button>
              ))}
            </div>
            <div className="et-galeria">
              {lista.map(t => (
                <button key={t.id} type="button" className="et-tema" title={t.desc} aria-pressed={p.id === t.id && !p.finoDest && !p.fundo}
                  onClick={() => setP({ ...t })}>
                  <Mini p={t} /><span>{t.nome}</span>
                </button>
              ))}
              {meus.map((t, i) => (
                <span key={`u${i}`} className="et-meu">
                  <button type="button" className="et-tema" title="Meu tema" aria-pressed={p.id === `u${i}`} onClick={() => setP({ ...t, id: `u${i}` })}>
                    <Mini p={t} /><span>★ {t.nome}</span>
                  </button>
                  <button type="button" className="et-apagar" aria-label={`Apagar o tema ${t.nome}`} onClick={() => apagarMeu(i)}>×</button>
                </span>
              ))}
            </div>
          </section>

          <section>
            <h4>Círculo cromático <span className="fraco">{Math.round(p.h)}°</span></h4>
            <p className="fraco" style={{ margin: '0 0 10px' }}>Arraste para escolher a cor base.</p>
            <div className="et-roda" ref={roda} role="slider" tabIndex={0} aria-label="Cor base" aria-valuemin={0} aria-valuemax={359} aria-valuenow={Math.round(p.h)}
              onPointerDown={e => { arrastando.current = true; e.currentTarget.setPointerCapture(e.pointerId); manual({ h: anguloDe(e) }) }}
              onPointerMove={e => { if (arrastando.current) manual({ h: anguloDe(e) }) }}
              onPointerUp={() => { arrastando.current = false }}
              onKeyDown={e => {
                const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 5 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -5 : 0
                if (d) { e.preventDefault(); manual({ h: (p.h + d + 360) % 360 }) }
              }}>
              <svg viewBox="0 0 200 200" aria-hidden>
                {xs.length > 1 && xs.map((a, i) => {
                  const b = xs[(i + 1) % xs.length]
                  return xs.length > 2 || i === 0
                    ? <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#fff" strokeOpacity=".8" strokeWidth="1.6" strokeDasharray="4 4" />
                    : null
                })}
                {graus.map((g, i) => (
                  <g key={i}>
                    <circle cx={xs[i][0]} cy={xs[i][1]} r={i === 0 ? 11 : 8.5} fill="#fff" />
                    <circle cx={xs[i][0]} cy={xs[i][1]} r={i === 0 ? 9 : 6.5} fill={hex(hsl(g, 80, 50))} />
                  </g>
                ))}
              </svg>
            </div>
          </section>

          <section>
            <h4>Harmonia</h4>
            <div className="chips">
              {(Object.keys(HARMONIAS) as Harmonia[]).map(h => (
                <button key={h} type="button" className={`chip ${p.harm === h ? 'ativo' : ''}`} aria-pressed={p.harm === h} onClick={() => manual({ harm: h })}>{HARMONIAS[h].nome}</button>
              ))}
            </div>
            <p className="fraco" style={{ margin: '8px 0 0' }}>{HARMONIAS[p.harm].dica}</p>
          </section>

          <section>
            <h4>Intensidade <span className="fraco">{p.s < 30 ? 'suave' : p.s < 62 ? 'média' : 'vibrante'}</span></h4>
            <input type="range" min={0} max={100} value={p.s} style={{ width: '100%' }} aria-label="Intensidade das cores"
              onChange={e => manual({ s: Number(e.target.value) })} />
          </section>

          <section>
            <h4>Menu lateral</h4>
            <div className="chips">
              {(['claro', 'escuro'] as const).map(m => (
                <button key={m} type="button" className={`chip ${p.menu === m ? 'ativo' : ''}`} aria-pressed={p.menu === m} onClick={() => manual({ menu: m })}>{m === 'claro' ? 'Claro' : 'Escuro'}</button>
              ))}
            </div>
          </section>

          <section>
            <h4>Ajuste fino</h4>
            <div className="linha">
              <label className="et-cor">
                <input type="color" value={hex(atual.acento)} onChange={e => setP(x => ({ ...x, finoDest: e.target.value }))} />
                Destaque
              </label>
              <label className="et-cor">
                <input type="color" value={p.fundo || hex(gerarTema(p, false).papel)} onChange={e => setP(x => ({ ...x, fundo: e.target.value }))} />
                Fundo (modo claro)
              </label>
              {(p.finoDest || p.fundo) && (
                <Botao pequeno variante="fantasma" onClick={() => setP(x => { const n = { ...x }; delete n.finoDest; delete n.fundo; return n })}>↺ Automático</Botao>
              )}
            </div>
          </section>

          <section>
            <h4>Teste de contraste <span className={`et-sel ${falhas ? 'ruim' : 'ok'}`}>{falhas ? `${falhas} abaixo de 4,5` : 'todos passam de 4,5'}</span></h4>
            <p className="fraco" style={{ margin: '0 0 8px' }}>Conferido no {escuro ? 'modo escuro' : 'modo claro'}, que é o que está na tela.</p>
            <div style={{ display: 'grid', gap: 6 }}>
              {pares.map(q => (
                <div key={q.rotulo} className="et-cr">
                  <span className="et-sw" style={{ background: hex(q.fundo), color: hex(q.frente) }}>Aa</span>
                  <span style={{ flex: 1 }}>{q.rotulo}</span>
                  <b>{q.razao.toFixed(1).replace('.', ',')}</b>
                  <span className={`et-sel ${q.ok ? 'ok' : 'ruim'}`}>{q.ok ? 'AA ok' : 'baixo'}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4>Guardar como meu tema</h4>
            <div className="linha" style={{ flexWrap: 'nowrap' }}>
              <input className="entrada" placeholder="Nome do tema" value={nomeMeu} maxLength={30} onChange={e => { setNomeMeu(e.target.value); setAviso('') }}
                onKeyDown={e => e.key === 'Enter' && guardarMeu()} />
              <Botao onClick={guardarMeu}>Guardar</Botao>
            </div>
            {aviso && <p className="fraco" style={{ margin: '6px 0 0' }}>{aviso}</p>}
          </section>
        </div>

        <div className="et-rodape">
          <Botao variante="fantasma" pequeno disabled={temaEhPadrao(p)} onClick={() => setP({ ...TEMAS[0] })}>Voltar ao Clássico</Botao>
          <span className="espaco" />
          <Botao onClick={cancelar}>Cancelar</Botao>
          <Botao variante="primario" onClick={aplicar}>Aplicar</Botao>
        </div>
      </aside>
    </div>
  )
}
