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
  lixo: <svg viewBox="0 0 24 24" {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>,
}
