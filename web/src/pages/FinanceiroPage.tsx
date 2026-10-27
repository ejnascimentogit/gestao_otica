import { useState } from 'react'
import { Badge, Botao, Card, PageHeader } from '../components/ui'
import { formatarData, formatarMoeda, hojeISO } from '../domain/formatos'
import { baixarParcela, FORMAS, useStore } from '../data/store'

export function FinanceiroPage() {
  const { parcelas, clientes, ordens } = useStore()
  const [aba, setAba] = useState<'receber' | 'caixa'>('receber')
  const hoje = hojeISO()

  const abertas = parcelas.filter(p => !p.pago).sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  const porMes = abertas.reduce<Record<string, number>>((acc, p) => { const m = p.vencimento.slice(0, 7); acc[m] = (acc[m] ?? 0) + p.valorCentavos; return acc }, {})
  const movimentos = ordens.flatMap(o => o.pagamentos.map(p => ({ ...p, os: o.numero, cliente: clientes.find(c => c.id === o.clienteId)?.nome })))
    .sort((a, b) => b.em.localeCompare(a.em))
  const totalCaixaHoje = movimentos.filter(m => m.em === hoje).reduce((s, m) => s + m.valor, 0)

  return (
    <div>
      <PageHeader titulo="Financeiro" />
      <div className="chips" style={{ marginBottom: 16 }}>
        <button className={`chip ${aba === 'receber' ? 'ativo' : ''}`} onClick={() => setAba('receber')}>Contas a receber</button>
        <button className={`chip ${aba === 'caixa' ? 'ativo' : ''}`} onClick={() => setAba('caixa')}>Caixa</button>
      </div>

      {aba === 'receber' && (
        <>
          <div className="kpis">
            {Object.entries(porMes).slice(0, 4).map(([m, v]) => (
              <div className="kpi" key={m}><span>{new Date(m + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span><strong>{formatarMoeda(v)}</strong></div>
            ))}
          </div>
          <Card titulo="Parcelas em aberto" sem_padding>
            {abertas.length === 0 ? <div className="vazio">Nenhuma parcela em aberto.</div> : (
              <div className="tabela-wrap">
                <table className="tabela">
                  <thead><tr><th>Vencimento</th><th>Cliente</th><th>OS</th><th>Parcela</th><th>Situação</th><th className="num">Valor</th><th /></tr></thead>
                  <tbody>
                    {abertas.map(p => (
                      <tr key={p.id}>
                        <td>{formatarData(p.vencimento)}</td>
                        <td>{clientes.find(c => c.id === p.clienteId)?.nome}</td>
                        <td>{p.osNumero}</td>
                        <td>{p.numero}ª</td>
                        <td>{p.vencimento < hoje ? <Badge tom="erro">Vencida</Badge> : <Badge tom="info">A vencer</Badge>}</td>
                        <td className="num"><b>{formatarMoeda(p.valorCentavos)}</b></td>
                        <td className="num"><Botao pequeno onClick={() => baixarParcela(p.id)}>Dar baixa</Botao></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {aba === 'caixa' && (
        <>
          <div className="kpis"><div className="kpi"><span>Entradas de hoje</span><strong>{formatarMoeda(totalCaixaHoje)}</strong></div></div>
          <Card titulo="Movimentos" sem_padding>
            <div className="tabela-wrap">
              <table className="tabela">
                <thead><tr><th>Data</th><th>Descrição</th><th>Forma</th><th className="num">Valor</th></tr></thead>
                <tbody>
                  {movimentos.map(m => (
                    <tr key={m.id}><td>{formatarData(m.em)}</td><td>Entrada OS {m.os} · {m.cliente}</td><td>{FORMAS[m.forma]}</td><td className="num" style={{ color: 'var(--ok)' }}>{formatarMoeda(m.valor)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
