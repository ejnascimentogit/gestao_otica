import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from 'react'

export function PageHeader({ titulo, sub, acoes }: { titulo: string; sub?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="cabecalho">
      <div>
        <h1>{titulo}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {acoes && <div className="linha">{acoes}</div>}
    </div>
  )
}

export function Card({ titulo, acoes, children, sem_padding }: { titulo?: ReactNode; acoes?: ReactNode; children: ReactNode; sem_padding?: boolean }) {
  return (
    <section className="card">
      {titulo && <div className="card-titulo"><span>{titulo}</span>{acoes}</div>}
      {sem_padding ? children : <div className="card-corpo">{children}</div>}
    </section>
  )
}

/** `composto`: use quando o campo tem mais de um controle (ex.: busca + botões), para o <label> não redirecionar cliques. */
export function Campo({ rotulo, erro, children, style, composto }: { rotulo: string; erro?: string; children: ReactNode; style?: React.CSSProperties; composto?: boolean }) {
  const Tag = composto ? 'div' : 'label'
  return (
    <Tag className="campo" style={style}>
      <span>{rotulo}</span>
      {children}
      {erro && <span className="erro-msg">{erro}</span>}
    </Tag>
  )
}

export const Entrada = ({ className = '', invalida, ...p }: InputHTMLAttributes<HTMLInputElement> & { invalida?: boolean }) => (
  <input className={`entrada ${invalida ? 'invalida' : ''} ${className}`} {...p} />
)

export const Selecao = ({ className = '', ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={`entrada ${className}`} {...p} />
)

export const Botao = ({ variante, pequeno, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'acento' | 'fantasma'; pequeno?: boolean }) => (
  <button type="button" className={`botao ${variante ?? ''} ${pequeno ? 'pequeno' : ''} ${className}`} {...p} />
)

export const Badge = ({ tom, children }: { tom: string; children: ReactNode }) => (
  <span className={`badge tom-${tom}`}>{children}</span>
)

export function Modal({ titulo, aoFechar, children, rodape }: { titulo: string; aoFechar: () => void; children: ReactNode; rodape?: ReactNode }) {
  return (
    <div className="modal-fundo" onMouseDown={e => e.target === e.currentTarget && aoFechar()}>
      <div className="modal" role="dialog" aria-label={titulo}>
        <div className="card-titulo"><span>{titulo}</span><Botao variante="fantasma" pequeno onClick={aoFechar}>Fechar</Botao></div>
        <div className="card-corpo">{children}</div>
        {rodape && <div className="card-corpo linha" style={{ borderTop: '1px solid var(--borda)', justifyContent: 'flex-end' }}>{rodape}</div>}
      </div>
    </div>
  )
}

// Ícones de traço simples, desenhados para o projeto
const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
export const Icone = {
  painel: <svg viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
  os: <svg viewBox="0 0 24 24" {...p}><circle cx="7" cy="14" r="3.5" /><circle cx="17" cy="14" r="3.5" /><path d="M10.5 14h3M3.5 13 5 6h2M20.5 13 19 6h-2" /></svg>,
  clientes: <svg viewBox="0 0 24 24" {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.5 3.5 5.2" /></svg>,
  produtos: <svg viewBox="0 0 24 24" {...p}><path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9L12 3Z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" /></svg>,
  financeiro: <svg viewBox="0 0 24 24" {...p}><rect x="2.5" y="5.5" width="19" height="13" rx="2" /><circle cx="12" cy="12" r="2.8" /><path d="M6 9v6M18 9v6" /></svg>,
  agenda: <svg viewBox="0 0 24 24" {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
  simulador: <svg viewBox="0 0 24 24" {...p}><path d="M12 3c-3 3-4.5 6-4.5 9s1.5 6 4.5 9c3-3 4.5-6 4.5-9S15 6 12 3Z" /><path d="M12 3v18" /></svg>,
  mais: <svg viewBox="0 0 24 24" {...p}><path d="M12 5v14M5 12h14" /></svg>,
  menu: <svg viewBox="0 0 24 24" {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  voltar: <svg viewBox="0 0 24 24" {...p}><path d="M15 5l-7 7 7 7" /></svg>,
  imprimir: <svg viewBox="0 0 24 24" {...p}><path d="M7 9V3h10v6M7 17H4v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6h-3" /><rect x="7" y="14" width="10" height="7" /></svg>,
  calc: <svg viewBox="0 0 24 24" {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></svg>,
  camera: <svg viewBox="0 0 24 24" {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>,
  laboratorio: <svg viewBox="0 0 24 24" {...p}><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" /><path d="M7.5 15h9" /></svg>,
  chave: <svg viewBox="0 0 24 24" {...p}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M14 9l2 2" /></svg>,
  catalogo: <svg viewBox="0 0 24 24" {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="12.5" r="2.5" /><circle cx="15.5" cy="12.5" r="2.5" /><path d="M11 12.5h2M3 8h18" /></svg>,
  recibo: <svg viewBox="0 0 24 24" {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>,
  lixo: <svg viewBox="0 0 24 24" {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>,
}

/* ---- Layout da família Full (faixa de resumo, linha com faixa lateral, cartão de grupo) ---- */

export interface NumeroFaixa { valor: ReactNode; rotulo: string; detalhe?: ReactNode; tom?: 'dest' | 'alerta' }
export interface SegmentoFaixa { rotulo: string; n: number; cor: string }

/** Barra escura do topo: 2 a 4 números de ação e, opcional, a distribuição com legenda. */
export function FaixaResumo({ numeros, titulo, segmentos }: { numeros: NumeroFaixa[]; titulo?: string; segmentos?: SegmentoFaixa[] }) {
  const total = segmentos?.reduce((s, x) => s + x.n, 0) ?? 0
  return (
    <div className={`ff-faixa ${segmentos ? '' : 'sem-dist'}`} style={{ ['--ff-n' as string]: numeros.length }}>
      {numeros.map(n => (
        <div key={n.rotulo} className={`ff-k ${n.tom ?? ''}`}><b>{n.valor}</b><span>{n.rotulo}</span>{n.detalhe && <small>{n.detalhe}</small>}</div>
      ))}
      {segmentos && (
        <div className="ff-dist">
          {titulo && <div className="ff-tit">{titulo}</div>}
          <div className="ff-bar">{total === 0 ? <i style={{ flex: 1, opacity: .25, background: '#fff' }} /> :
            segmentos.filter(s => s.n > 0).map(s => <i key={s.rotulo} style={{ flex: s.n, background: s.cor }} title={`${s.rotulo}: ${s.n}`} />)}</div>
          <div className="ff-leg">{segmentos.map(s => <span key={s.rotulo}><i style={{ background: s.cor }} />{s.rotulo} <b>{s.n}</b></span>)}</div>
        </div>
      )}
    </div>
  )
}

/** Linha de lista com faixa lateral na cor `cor` (variável CSS ou cor de dado). */
export function LinhaFaixa({ cor, inicio, titulo, sub, fim, aoClicar }: { cor: string; inicio?: ReactNode; titulo: ReactNode; sub?: ReactNode; fim?: ReactNode; aoClicar?: () => void }) {
  return (
    <div className={`ff-lin ${aoClicar ? 'clicavel' : ''}`} style={{ ['--e' as string]: cor }} onClick={aoClicar}
      role={aoClicar ? 'button' : undefined} tabIndex={aoClicar ? 0 : undefined}
      onKeyDown={aoClicar ? ev => { if (ev.key === 'Enter') aoClicar() } : undefined}>
      {inicio}
      <div className="ff-t"><b>{titulo}</b>{sub && <span>{sub}</span>}</div>
      {fim}
    </div>
  )
}

export const Avatar = ({ texto }: { texto: string }) => <div className="ff-av">{texto}</div>
export const Pilula = ({ tom, children }: { tom: 'erro' | 'alerta' | 'ok' | 'info' | 'marca'; children: ReactNode }) => <span className={`ff-pil ff-${tom}`}>{children}</span>

/** Cartão de grupo: cabeçalho em degradê, anel com total, faixas com bolinha, mini-números e selo. */
export function CartaoGrupo({ cor, sigla, titulo, sub, pilula, total, rotuloTotal, faixas, mini, selo }: {
  cor: string; sigla: string; titulo: string; sub?: ReactNode; pilula?: ReactNode
  total: number; rotuloTotal: string; faixas: SegmentoFaixa[]
  mini: { valor: ReactNode; rotulo: string }[]; selo?: { tom: 'erro' | 'alerta' | 'ok'; texto: string }
}) {
  const soma = faixas.reduce((s, f) => s + f.n, 0)
  let acc = 0
  const anel = soma === 0 ? 'var(--borda)' : `conic-gradient(${faixas.filter(f => f.n > 0).map(f => {
    const de = (acc / soma) * 100; acc += f.n; return `${f.cor} ${de}% ${(acc / soma) * 100}%`
  }).join(',')})`
  return (
    <div className="ff-grupo">
      <div className="ff-cab" style={{ ['--c' as string]: cor }}>
        <div className="ff-av">{sigla}</div>
        <div className="ff-cab-t"><b>{titulo}</b>{sub && <small>{sub}</small>}</div>
        {pilula && <span className="ff-pil">{pilula}</span>}
      </div>
      <div className="ff-corpo">
        <div className="ff-anel" style={{ background: anel }}><div><b>{total}</b><small>{rotuloTotal}</small></div></div>
        <div className="ff-fx">{faixas.map(f => <div key={f.rotulo}><span><i style={{ background: f.cor }} />{f.rotulo}</span><b>{f.n}</b></div>)}</div>
      </div>
      <div className="ff-mini">{mini.map(m => <div key={m.rotulo}><b>{m.valor}</b><span>{m.rotulo}</span></div>)}</div>
      {selo && <div className="ff-selo-w"><span className={`ff-selo ff-${selo.tom}`}>{selo.texto}</span></div>}
    </div>
  )
}
