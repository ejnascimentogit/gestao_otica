import { formatarData, formatarMoeda, hojeISO } from '../../domain/formatos'
import { valorPorExtenso } from '../../domain/crediario'
import { useStore, type OrdemServico } from '../../data/store'

export function ImpressaoPromissoria({ os }: { os: OrdemServico }) {
  const { clientes, parcelas, loja: LOJA } = useStore()
  const c = clientes.find(x => x.id === os.clienteId)
  const lista = parcelas.filter(p => p.osNumero === os.numero)

  return (
    <div>
      {lista.map(p => (
        <div key={p.id} className="via" style={{ background: '#fff', color: '#111', border: '2px solid #111', borderRadius: 6, padding: 24, marginBottom: 24, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <b style={{ fontSize: 18, letterSpacing: '.08em' }}>NOTA PROMISSÓRIA</b>
            <span>Nº {os.numero}/{p.numero}</span>
            <b style={{ fontSize: 18 }}>{formatarMoeda(p.valorCentavos)}</b>
          </div>
          <p>Vencimento: <b>{formatarData(p.vencimento)}</b></p>
          <p style={{ lineHeight: 1.8 }}>
            Na data de vencimento acima, pagarei por esta única via de nota promissória a <b>{LOJA.nome}</b>, CNPJ {LOJA.cnpj},
            ou à sua ordem, a quantia de <b>{valorPorExtenso(p.valorCentavos)}</b> ({formatarMoeda(p.valorCentavos)}),
            em moeda corrente deste país, pagável em {LOJA.endereco}.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div><b>Emitente:</b> {c?.nome}<br /><b>CPF:</b> {c?.cpf}<br /><b>Endereço:</b> {c?.endereco ?? '________________________'}</div>
            <div style={{ alignSelf: 'end' }}>
              Recife, {formatarData(hojeISO())}
              <div style={{ marginTop: 36, borderTop: '1px solid #111', paddingTop: 4 }}>Assinatura do emitente</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
