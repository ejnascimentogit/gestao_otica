import { useState } from 'react'
import { Badge, Botao, Card, Campo, Entrada, Icone, Modal, PageHeader, Selecao } from '../components/ui'
import { formatarData, hojeISO } from '../domain/formatos'
import { mudarStatusAgendamento, salvarAgendamento, tentar, useStore } from '../data/store'

const DOW = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
const TOM = { agendado: 'info', realizado: 'ok', cancelado: 'erro' } as const

export function AgendaPage() {
  const { agendamentos } = useStore()
  const hoje = hojeISO()
  const [sel, setSel] = useState(hoje)
  const [mes, setMes] = useState(hoje.slice(0, 7))
  const [novo, setNovo] = useState(false)
  const [form, setForm] = useState({ clienteNome: '', tipo: 'Exame de vista', hora: '09:00' })

  const [a, m] = mes.split('-').map(Number)
  const primeiro = new Date(a, m - 1, 1)
  const offset = (primeiro.getDay() + 6) % 7
  const dias = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(a, m - 1, 1 - offset + i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const mudarMes = (delta: number) => { const d = new Date(a, m - 1 + delta, 1); setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`) }
  const doDia = agendamentos.filter(x => x.inicio.startsWith(sel)).sort((x, y) => x.inicio.localeCompare(y.inicio))

  return (
    <div>
      <PageHeader titulo="Agenda" acoes={<Botao variante="primario" onClick={() => setNovo(true)}>{Icone.mais} Novo agendamento</Botao>} />
      <div className="duas-colunas" style={{ gridTemplateColumns: '340px minmax(0,1fr)' }}>
        <Card titulo={primeiro.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} acoes={<div className="linha"><Botao pequeno onClick={() => mudarMes(-1)}>‹</Botao><Botao pequeno onClick={() => mudarMes(1)}>›</Botao></div>}>
          <div className="calendario">
            {DOW.map(d => <div key={d} className="dow">{d}</div>)}
            {dias.map(d => (
              <button key={d} className={`${d.slice(0, 7) !== mes ? 'fora' : ''} ${d === sel ? 'sel' : ''} ${d === hoje ? 'hoje' : ''}`} onClick={() => setSel(d)}>
                {Number(d.slice(8))}
                {agendamentos.some(x => x.inicio.startsWith(d) && x.status === 'agendado') && <span className="ponto" />}
              </button>
            ))}
          </div>
        </Card>
        <Card titulo={`Agenda de ${formatarData(sel)}`}>
          {doDia.length === 0 ? <div className="vazio">Nenhum agendamento neste dia.</div> : doDia.map(x => (
            <div key={x.id} className="linha" style={{ padding: '10px 0', borderBottom: '1px solid var(--borda)' }}>
              <b style={{ width: 52 }}>{x.inicio.slice(11, 16)}</b>
              <div style={{ flex: 1 }}>{x.clienteNome}<div className="fraco">{x.tipo}</div></div>
              <Badge tom={TOM[x.status]}>{x.status}</Badge>
              {x.status === 'agendado' && <>
                <Botao pequeno onClick={() => tentar(() => mudarStatusAgendamento(x.id, 'realizado'))}>Realizado</Botao>
                <Botao pequeno variante="fantasma" onClick={() => tentar(() => mudarStatusAgendamento(x.id, 'cancelado'))}>Cancelar</Botao>
              </>}
            </div>
          ))}
        </Card>
      </div>

      {novo && (
        <Modal titulo={`Novo agendamento · ${formatarData(sel)}`} aoFechar={() => setNovo(false)} rodape={<>
          <Botao onClick={() => setNovo(false)}>Cancelar</Botao>
          <Botao variante="primario" disabled={!form.clienteNome} onClick={async () => { const ok = await tentar(() => salvarAgendamento({ clienteNome: form.clienteNome, tipo: form.tipo, inicio: `${sel}T${form.hora}`, status: 'agendado' })); if (ok !== null) setNovo(false) }}>Agendar</Botao>
        </>}>
          <div className="grade">
            <Campo rotulo="Cliente" style={{ gridColumn: '1 / -1' }}><Entrada autoFocus value={form.clienteNome} onChange={e => setForm({ ...form, clienteNome: e.target.value })} /></Campo>
            <Campo rotulo="Tipo"><Selecao value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option>Exame de vista</option><option>Retirada</option><option>Ajuste</option></Selecao></Campo>
            <Campo rotulo="Horário"><Entrada type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} /></Campo>
          </div>
        </Modal>
      )}
    </div>
  )
}
