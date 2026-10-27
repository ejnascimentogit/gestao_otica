import { Badge, Card, PageHeader } from '../components/ui'
import { formatarData, formatarMoeda, hojeISO } from '../domain/formatos'
import { totalOs } from '../domain/totais'
import { STATUS_OS, useStore, type StatusOs } from '../data/store'

export function DashboardPage({ irPara }: { irPara: (rota: string) => void }) {
  const { ordens, parcelas, agendamentos, clientes } = useStore()
  const hoje = hojeISO()
  const mes = hoje.slice(0, 7)

  const doMes = ordens.filter(o => o.dataOs.startsWith(mes) && o.status !== 'orcamento' && o.status !== 'cancelada')
  const faturado = doMes.reduce((s, o) => s + totalOs(o.itens, o.descontoGeral), 0)
  const recebidoMes = ordens.flatMap(o => o.pagamentos).filter(p => p.em.startsWith(mes)).reduce((s, p) => s + p.valor, 0)
  const aReceber = parcelas.filter(p => !p.pago).reduce((s, p) => s + p.valorCentavos, 0)
  const vencidas = parcelas.filter(p => !p.pago && p.vencimento < hoje)
  const ticket = doMes.length ? Math.round(faturado / doMes.length) : 0

  const funil: StatusOs[] = ['orcamento', 'aberta', 'em_laboratorio', 'aguardando_retirada']
  const maxFunil = Math.max(1, ...funil.map(s => ordens.filter(o => o.status === s).length))
  const agendaHoje = agendamentos.filter(a => a.inicio.startsWith(hoje)).sort((a, b) => a.inicio.localeCompare(b.inicio))
  const atrasadas = ordens.filter(o => o.previsao && o.previsao < hoje && ['aberta', 'em_laboratorio'].includes(o.status))

  return (
    <div>
      <PageHeader titulo="Painel" sub={`Resumo de ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`} />

      <div className="kpis">
        <div className="kpi"><span>Vendido no mês</span><strong>{formatarMoeda(faturado)}</strong><small>{doMes.length} OS</small></div>
        <div className="kpi"><span>Recebido no mês</span><strong style={{ color: 'var(--ok)' }}>{formatarMoeda(recebidoMes)}</strong><small>entradas e baixas</small></div>
        <div className="kpi"><span>A receber (crediário)</span><strong>{formatarMoeda(aReceber)}</strong><small style={{ color: vencidas.length ? 'var(--erro)' : undefined }}>{vencidas.length} parcela(s) vencida(s)</small></div>
        <div className="kpi"><span>Ticket médio</span><strong>{formatarMoeda(ticket)}</strong><small>por OS no mês</small></div>
      </div>

      <div className="duas-colunas">
        <div>
          <Card titulo="OS em andamento" acoes={<button className="botao fantasma pequeno" onClick={() => irPara('ordens')}>Ver todas</button>}>
            {funil.map(s => {
              const n = ordens.filter(o => o.status === s).length
              return (
                <div key={s} className="linha" style={{ marginBottom: 10 }}>
                  <div style={{ width: 170 }}><Badge tom={STATUS_OS[s].tom}>{STATUS_OS[s].rotulo}</Badge></div>
                  <div style={{ flex: 1, height: 10, background: 'var(--superficie-2)', borderRadius: 99 }}>
                    <div style={{ width: `${(n / maxFunil) * 100}%`, height: '100%', background: 'var(--marca)', borderRadius: 99 }} />
                  </div>
                  <b style={{ width: 24, textAlign: 'right' }}>{n}</b>
                </div>
              )
            })}
          </Card>

          <Card titulo="Entregas atrasadas" sem_padding>
            {atrasadas.length === 0 ? <div className="vazio">Nenhuma OS com entrega atrasada.</div> : (
              <table className="tabela"><tbody>
                {atrasadas.map(o => (
                  <tr key={o.id}><td><b>OS {o.numero}</b></td><td>{clientes.find(c => c.id === o.clienteId)?.nome}</td><td style={{ color: 'var(--erro)' }}>previsto {formatarData(o.previsao)}</td></tr>
                ))}
              </tbody></table>
            )}
          </Card>
        </div>

        <div>
          <Card titulo="Agenda de hoje" acoes={<button className="botao fantasma pequeno" onClick={() => irPara('agenda')}>Abrir agenda</button>}>
            {agendaHoje.length === 0 ? <div className="vazio">Nada marcado para hoje.</div> : agendaHoje.map(a => (
              <div key={a.id} className="linha" style={{ marginBottom: 10 }}>
                <b style={{ width: 48 }}>{a.inicio.slice(11, 16)}</b>
                <div style={{ flex: 1 }}>{a.clienteNome}<div className="fraco">{a.tipo}</div></div>
              </div>
            ))}
          </Card>
          <Card titulo="Parcelas vencidas">
            {vencidas.length === 0 ? <div className="fraco">Nenhuma.</div> : vencidas.map(p => (
              <div key={p.id} className="linha" style={{ marginBottom: 8 }}>
                <div style={{ flex: 1 }}>{clientes.find(c => c.id === p.clienteId)?.nome}<div className="fraco">OS {p.osNumero} · {p.numero}ª · {formatarData(p.vencimento)}</div></div>
                <b style={{ color: 'var(--erro)' }}>{formatarMoeda(p.valorCentavos)}</b>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
