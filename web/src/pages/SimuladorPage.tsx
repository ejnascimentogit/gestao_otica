import { useState } from 'react'
import { Botao, Card, Campo, Entrada, PageHeader, Selecao } from '../components/ui'
import { estimarEspessura, INDICES } from '../domain/espessura'
import { formatarDioptria, meridianoCritico, parseDioptria } from '../domain/receita'
import { useStore } from '../data/store'

function PerfilLente({ poder, indice, escala = 6 }: { poder: number; indice: number; escala?: number }) {
  const e = estimarEspessura(poder, indice)
  const w = 180, cx = w / 2, topo = 12
  const c = e.centro * escala, b = e.borda * escala
  const altura = topo * 2 + Math.max(c, b) + 4
  // perfil simétrico: borda (b) nas laterais, centro (c) no meio
  const d = `M 10 ${topo} Q ${cx} ${topo + (c > b ? -(c - b) : (b - c)) * 0.9} ${w - 10} ${topo}
             L ${w - 10} ${topo + b} Q ${cx} ${topo + b + (c > b ? (c - b) : -(b - c)) * 0.9} 10 ${topo + b} Z`
  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox={`0 0 ${w} ${altura}`} width="100%" style={{ maxWidth: 200 }}>
        <path d={d} fill="var(--marca-suave)" stroke="var(--marca)" strokeWidth="1.5" />
      </svg>
      <b>{indice.toFixed(2)}</b>
      <div className="fraco">centro {e.centro.toFixed(1)} mm · borda {e.borda.toFixed(1)} mm</div>
    </div>
  )
}

const CAMPOS = [
  { id: 'estreito', rotulo: 'Estreito', largura: 0.22 },
  { id: 'medio', rotulo: 'Médio', largura: 0.32 },
  { id: 'amplo', rotulo: 'Amplo', largura: 0.44 },
  { id: 'freeform', rotulo: 'Freeform', largura: 0.56 },
  { id: 'estendido', rotulo: 'Super estendido', largura: 0.68 },
]

function Progressiva({ largura }: { largura: number }) {
  // Mapa esquemático: área nítida (longe em cima, corredor no meio, perto embaixo) e laterais com distorção
  const L = 220, H = 160, cx = L / 2
  const corredor = 18 + largura * 40
  const perto = 30 + largura * 90
  const longe = 80 + largura * 120
  const area = `M ${cx - longe} 8 L ${cx + longe} 8 L ${cx + corredor} 70 L ${cx + corredor / 1.2} 100 L ${cx + perto / 2} 150 L ${cx - perto / 2} 150 L ${cx - corredor / 1.2} 100 L ${cx - corredor} 70 Z`
  return (
    <svg viewBox={`0 0 ${L} ${H}`} width="100%" style={{ maxWidth: 320 }}>
      <defs><clipPath id="lente"><ellipse cx={cx} cy={H / 2} rx={L / 2 - 4} ry={H / 2 - 4} /></clipPath></defs>
      <g clipPath="url(#lente)">
        <rect width={L} height={H} fill="var(--erro-suave)" />
        <path d={area} fill="var(--ok-suave)" stroke="var(--ok)" strokeWidth="1.2" />
      </g>
      <ellipse cx={cx} cy={H / 2} rx={L / 2 - 4} ry={H / 2 - 4} fill="none" stroke="var(--tinta-3)" strokeWidth="1.5" />
      <text x={cx} y={30} textAnchor="middle" fontSize="10" fill="var(--tinta-2)">longe</text>
      <text x={cx} y={88} textAnchor="middle" fontSize="10" fill="var(--tinta-2)">intermediário</text>
      <text x={cx} y={140} textAnchor="middle" fontSize="10" fill="var(--tinta-2)">perto</text>
    </svg>
  )
}

function Tratamentos() {
  const [ar, setAr] = useState(false)
  const [azul, setAzul] = useState(false)
  const [foto, setFoto] = useState(0)
  const [raios, setRaios] = useState(true)
  const tinta = `rgba(40, 52, 60, ${foto * 0.75})`
  return (
    <div className="duas-colunas" style={{ gridTemplateColumns: 'minmax(0,1fr) 260px' }}>
      <svg viewBox="0 0 320 180" width="100%">
        {/* tela emitindo luz */}
        <rect x="8" y="50" width="40" height="80" rx="4" fill="var(--tinta)" />
        <rect x="12" y="56" width="32" height="56" fill="#7aa7e0" />
        {raios && [70, 90, 110].map((y, k) => (
          <g key={k}>
            <line x1="48" y1={y} x2="150" y2={y} stroke="#4a7fd6" strokeWidth="3" strokeDasharray="6 4" />
            {!azul && <line x1="170" y1={y} x2="290" y2={y} stroke="#4a7fd6" strokeWidth="3" strokeDasharray="6 4" />}
          </g>
        ))}
        {/* lente */}
        <ellipse cx="160" cy="90" rx="14" ry="62" fill={foto > 0 ? tinta : 'rgba(255,255,255,.4)'} stroke="var(--marca)" strokeWidth="2" />
        {!ar && <path d="M 152 50 Q 158 60 154 75" stroke="#fff" strokeWidth="4" opacity=".9" fill="none" strokeLinecap="round" />}
        {!ar && <path d="M 150 40 Q 120 25 95 30" stroke="var(--acento)" strokeWidth="2" strokeDasharray="3 3" fill="none" />}
        {azul && <text x="160" y="170" textAnchor="middle" fontSize="11" fill="var(--marca)" fontWeight="700">luz azul filtrada</text>}
        {/* olho */}
        <path d="M 270 90 Q 290 70 310 90 Q 290 110 270 90 Z" fill="var(--superficie)" stroke="var(--tinta-2)" />
        <circle cx="290" cy="90" r="6" fill="var(--tinta)" />
      </svg>
      <div>
        <label className="linha" style={{ marginBottom: 8 }}><input type="checkbox" checked={ar} onChange={e => setAr(e.target.checked)} /> Antirreflexo</label>
        <label className="linha" style={{ marginBottom: 8 }}><input type="checkbox" checked={azul} onChange={e => setAzul(e.target.checked)} /> Filtro de luz azul</label>
        <label className="linha" style={{ marginBottom: 8 }}><input type="checkbox" checked={raios} onChange={e => setRaios(e.target.checked)} /> Mostrar raios</label>
        <Campo rotulo={`Fotossensível: ${foto === 0 ? 'ambiente interno' : foto === 1 ? 'sol pleno' : 'escurecendo'}`}>
          <input type="range" min={0} max={1} step={0.05} value={foto} onChange={e => setFoto(Number(e.target.value))} />
        </Campo>
        <div className="linha" style={{ marginTop: 8 }}>
          <Botao pequeno onClick={() => setFoto(0)}>Interno</Botao>
          <Botao pequeno onClick={() => setFoto(1)}>Sol</Botao>
        </div>
        <p className="fraco">Sem antirreflexo aparece o brilho na lente e o reflexo que volta para quem olha.</p>
      </div>
    </div>
  )
}

export function SimuladorPage() {
  const { ordens, clientes } = useStore()
  const [aba, setAba] = useState<'espessura' | 'multifocal' | 'tratamentos'>('espessura')
  const [osId, setOsId] = useState('')
  const [poderTxt, setPoderTxt] = useState('-4,00')
  const [campo, setCampo] = useState('amplo')

  const os = ordens.find(o => o.id === osId)
  const poder = os ? meridianoCritico(os.receita.longe.od, os.receita.longe.oe) : parseDioptria(poderTxt) ?? 0

  return (
    <div>
      <PageHeader titulo="Simulador de lentes" sub="Ferramenta para explicar ao cliente as diferenças entre as opções" />
      <div className="chips" style={{ marginBottom: 16 }}>
        {(['espessura', 'multifocal', 'tratamentos'] as const).map(a => (
          <button key={a} className={`chip ${aba === a ? 'ativo' : ''}`} onClick={() => setAba(a)}>
            {{ espessura: 'Espessura por índice', multifocal: 'Multifocais', tratamentos: 'Tratamentos' }[a]}
          </button>
        ))}
      </div>

      {aba === 'espessura' && (
        <Card titulo="Espessura estimada por índice de refração" acoes={<small>aproximação para demonstração</small>}>
          <div className="grade" style={{ marginBottom: 16 }}>
            <Campo rotulo="Usar receita de uma OS">
              <Selecao value={osId} onChange={e => setOsId(e.target.value)}>
                <option value="">Digitar grau</option>
                {ordens.map(o => <option key={o.id} value={o.id}>OS {o.numero} · {clientes.find(c => c.id === o.clienteId)?.nome}</option>)}
              </Selecao>
            </Campo>
            <Campo rotulo="Grau (maior meridiano)">
              <Entrada value={os ? formatarDioptria(poder) : poderTxt} disabled={!!os} onChange={e => setPoderTxt(e.target.value)} />
            </Campo>
          </div>
          <div className="grade" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            {INDICES.map(i => <PerfilLente key={i} poder={poder} indice={i} />)}
          </div>
          <p className="fraco">Quanto maior o índice, mais fina a lente para o mesmo grau. Grau negativo engrossa a borda; positivo engrossa o centro.</p>
        </Card>
      )}

      {aba === 'multifocal' && (
        <Card titulo="Campos de visão em lentes multifocais">
          <div className="chips" style={{ marginBottom: 16 }}>
            {CAMPOS.map(c => <button key={c.id} className={`chip ${campo === c.id ? 'ativo' : ''}`} onClick={() => setCampo(c.id)}>{c.rotulo}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <Progressiva largura={CAMPOS.find(c => c.id === campo)!.largura} />
            <div style={{ flex: '1 1 220px' }}>
              <p><span className="badge tom-ok">Verde</span> área de visão nítida</p>
              <p><span className="badge tom-erro">Rosa</span> zonas laterais com distorção</p>
              <p className="fraco">Desenhos mais modernos ampliam o corredor e reduzem a distorção lateral. Use para mostrar ao cliente por que a lente custa mais.</p>
            </div>
          </div>
        </Card>
      )}

      {aba === 'tratamentos' && <Card titulo="Tratamentos"><Tratamentos /></Card>}
    </div>
  )
}
