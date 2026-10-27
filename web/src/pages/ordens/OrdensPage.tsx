import { useState } from 'react'
import { Badge, Botao, Card, Entrada, Icone, PageHeader } from '../../components/ui'
import { formatarData, formatarMoeda, hojeISO } from '../../domain/formatos'
import { totalOs } from '../../domain/totais'
import { STATUS_OS, useStore, type OrdemServico, type StatusOs } from '../../data/store'
import { OrdemForm, novaOs } from './OrdemForm'

export function OrdensPage() {
  const { ordens, clientes, laboratorios } = useStore()
  const [editando, setEditando] = useState<OrdemServico | null>(null)
  const [filtro, setFiltro] = useState<StatusOs | 'todas'>('todas')
  const [busca, setBusca] = useState('')

  if (editando) return <OrdemForm key={editando.id} inicial={editando} aoVoltar={() => setEditando(null)} />

  const hoje = hojeISO()
  const lista = ordens
    .filter(o => filtro === 'todas' || o.status === filtro)
    .filter(o => {
      if (!busca) return true
      const c = clientes.find(x => x.id === o.clienteId)
      return (String(o.numero) + (c?.nome ?? '') + (c?.cpf ?? '')).toLowerCase().includes(busca.toLowerCase())
    })
    .sort((a, b) => b.numero - a.numero)

  const contagem = (s: StatusOs) => ordens.filter(o => o.status === s).length

  return (
    <div>
      <PageHeader titulo="Ordens de serviço" sub={`${ordens.length} OS cadastradas`}
        acoes={<Botao variante="primario" onClick={() => setEditando(novaOs())}>{Icone.mais} Nova OS</Botao>} />

      <div className="linha" style={{ marginBottom: 12 }}>
        <div style={{ flex: '1 1 260px', maxWidth: 360 }}><Entrada placeholder="Buscar por nº, cliente ou CPF" value={busca} onChange={e => setBusca(e.target.value)} /></div>
        <div className="chips">
          <button className={`chip ${filtro === 'todas' ? 'ativo' : ''}`} onClick={() => setFiltro('todas')}>Todas</button>
          {(Object.keys(STATUS_OS) as StatusOs[]).map(s => (
            <button key={s} className={`chip ${filtro === s ? 'ativo' : ''}`} onClick={() => setFiltro(s)}>{STATUS_OS[s].rotulo} · {contagem(s)}</button>
          ))}
        </div>
      </div>

      <Card sem_padding>
        {lista.length === 0 ? <div className="vazio">Nenhuma OS encontrada.</div> : (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>Nº</th><th>Cliente</th><th>Status</th><th>Laboratório</th><th>Data</th><th>Entrega</th><th className="num">Total</th><th className="num">Saldo</th></tr></thead>
              <tbody>
                {lista.map(o => {
                  const c = clientes.find(x => x.id === o.clienteId)
                  const total = totalOs(o.itens, o.descontoGeral)
                  const saldo = o.crediario ? 0 : total - o.pagamentos.reduce((s, p) => s + p.valor, 0)
                  const atrasada = o.previsao && o.previsao < hoje && !['finalizada', 'cancelada', 'aguardando_retirada'].includes(o.status)
                  return (
                    <tr key={o.id} className="clicavel" onClick={() => setEditando(o)}>
                      <td><b>{o.numero}</b></td>
                      <td>{c?.nome}<div className="fraco">{c?.celular}</div></td>
                      <td><Badge tom={STATUS_OS[o.status].tom}>{STATUS_OS[o.status].rotulo}</Badge></td>
                      <td className="muted">{laboratorios.find(l => l.id === o.laboratorioId)?.nome ?? '—'}</td>
                      <td>{formatarData(o.dataOs)}</td>
                      <td style={{ color: atrasada ? 'var(--erro)' : undefined, fontWeight: atrasada ? 700 : undefined }}>{formatarData(o.previsao)}{atrasada && ' · atrasada'}</td>
                      <td className="num">{formatarMoeda(total)}</td>
                      <td className="num" style={{ color: saldo > 0 ? 'var(--alerta)' : 'var(--tinta-3)' }}>{formatarMoeda(Math.max(0, saldo))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
