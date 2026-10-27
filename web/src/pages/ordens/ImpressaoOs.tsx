import { formatarData, formatarMoeda } from '../../domain/formatos'
import { formatarDioptria } from '../../domain/receita'
import { totalItem, totalOs } from '../../domain/totais'
import { useStore, type OrdemServico } from '../../data/store'

const VIAS = [
  { nome: 'Via do cliente', valores: true },
  { nome: 'Via da loja', valores: true },
  { nome: 'Via do laboratório', valores: false },
]

const st: Record<string, React.CSSProperties> = {
  via: { background: '#fff', color: '#111', border: '1px solid #ccc', borderRadius: 8, padding: 24, marginBottom: 24, fontSize: 12 },
  tab: { width: '100%', borderCollapse: 'collapse', marginTop: 8 },
  td: { border: '1px solid #bbb', padding: '4px 6px', textAlign: 'center' },
  th: { border: '1px solid #bbb', padding: '4px 6px', background: '#f1f1f1', fontSize: 11 },
}

export function ImpressaoOs({ os }: { os: OrdemServico }) {
  const { clientes, laboratorios, vendedores, loja: LOJA } = useStore()
  const c = clientes.find(x => x.id === os.clienteId)
  const lab = laboratorios.find(l => l.id === os.laboratorioId)
  const vend = vendedores.find(v => v.id === os.vendedorId)
  const r = os.receita
  const d = formatarDioptria
  const pago = os.pagamentos.reduce((s, p) => s + p.valor, 0)

  return (
    <div>
      {VIAS.map(via => (
        <div key={via.nome} className="via" style={st.via}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111', paddingBottom: 8 }}>
            <div><b style={{ fontSize: 16 }}>{LOJA.nome}</b><div>{LOJA.endereco} · {LOJA.telefone}</div><div>CNPJ {LOJA.cnpj}</div></div>
            <div style={{ textAlign: 'right' }}><b style={{ fontSize: 16 }}>OS nº {os.numero}</b><div>{via.nome}</div><div>Data {formatarData(os.dataOs)} · Entrega {formatarData(os.previsao)}</div></div>
          </div>

          <div style={{ marginTop: 10 }}>
            <b>Cliente:</b> {c?.nome} {via.valores && <>· {c?.cpf} · {c?.celular}</>}<br />
            <b>Vendedor:</b> {vend?.nome ?? '—'} · <b>Laboratório:</b> {lab?.nome ?? '—'}
            {os.controleInterno && <> · <b>Controle:</b> {os.controleInterno}</>}
          </div>

          <table style={st.tab}>
            <thead><tr><th style={st.th} /><th style={st.th}>Esférico</th><th style={st.th}>Cilindro</th><th style={st.th}>Eixo</th><th style={st.th}>DNP</th><th style={st.th}>Altura</th></tr></thead>
            <tbody>
              {(['od', 'oe'] as const).map(l => (
                <tr key={'l' + l}><td style={st.td}><b>Longe {l.toUpperCase()}</b></td><td style={st.td}>{d(r.longe[l].esf)}</td><td style={st.td}>{d(r.longe[l].cil)}</td><td style={st.td}>{r.longe[l].eixo ?? ''}{r.longe[l].eixo !== null && '°'}</td><td style={st.td}>{r.dnp[l] ?? ''}</td><td style={st.td}>{r.altura[l] ?? ''}</td></tr>
              ))}
              {(['od', 'oe'] as const).map(l => (
                <tr key={'p' + l}><td style={st.td}><b>Perto {l.toUpperCase()}</b></td><td style={st.td}>{d(r.perto[l].esf)}</td><td style={st.td}>{d(r.perto[l].cil)}</td><td style={st.td}>{r.perto[l].eixo ?? ''}</td><td style={st.td} /><td style={st.td} /></tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 6 }}>
            <b>Adição:</b> {d(r.adicao) || '—'} · <b>Armação:</b> {r.armacao.tipo || '—'} H {r.armacao.horizontal ?? '—'} V {r.armacao.vertical ?? '—'} DM {r.armacao.diagonal ?? '—'} Ponte {r.armacao.ponte ?? '—'}
            {r.observacoes && <div><b>Obs. receita:</b> {r.observacoes}</div>}
          </div>

          <table style={st.tab}>
            <thead><tr><th style={{ ...st.th, textAlign: 'left' }}>Item</th><th style={st.th}>Qtd</th>{via.valores && <><th style={st.th}>Unit.</th><th style={st.th}>Total</th></>}</tr></thead>
            <tbody>
              {os.itens.map(i => (
                <tr key={i.id}><td style={{ ...st.td, textAlign: 'left' }}>{i.descricao}</td><td style={st.td}>{i.quantidade} {i.unidade}</td>
                  {via.valores && <><td style={st.td}>{formatarMoeda(i.valorUnitario)}</td><td style={st.td}>{formatarMoeda(totalItem(i))}</td></>}</tr>
              ))}
            </tbody>
          </table>

          {via.valores && (
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              Desconto {formatarMoeda(os.descontoGeral)} · <b>Total {formatarMoeda(totalOs(os.itens, os.descontoGeral))}</b> · Pago {formatarMoeda(pago)}
            </div>
          )}
          {os.observacoes && <div style={{ marginTop: 8 }}><b>Observações:</b> {os.observacoes}</div>}
          {via.nome === 'Via da loja' && <div style={{ marginTop: 32, borderTop: '1px solid #111', width: 260, paddingTop: 4 }}>Assinatura do cliente</div>}
        </div>
      ))}
    </div>
  )
}
