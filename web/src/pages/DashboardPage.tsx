// Painel: o que fazer hoje (layout da família Full). Números de faturamento ficam para a tela Indicadores.
import { Avatar, Card, CartaoGrupo, FaixaResumo, LinhaFaixa, PageHeader, Pilula } from '../components/ui'
import { formatarData, formatarMoeda, hojeISO } from '../domain/formatos'
import { iniciais, resumoPainel, type Pendencia } from '../domain/painel'
import { STATUS_OS, useStore } from '../data/store'

// Cores de dado (fixas): sobre a faixa escura e nos cabeçalhos dos laboratórios.
const COR_ETAPA = { orcamento: '#9fb8c9', aberta: '#7aa7e0', em_laboratorio: '#b58ce6', aguardando_retirada: '#ffc874' } as const
const COR_LAB = ['#2c5f9e', '#2f7d4f', '#6b3fa0', '#0e5c58', '#a8650d', '#b0316b']
const MAX_LINHAS = 8

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

export function DashboardPage({ irPara }: { irPara: (rota: string) => void }) {
  const { ordens, parcelas, agendamentos, clientes, laboratorios } = useStore()
  const hoje = hojeISO()
  const r = resumoPainel(ordens, parcelas, laboratorios, hoje)
  const agendaHoje = agendamentos.filter(a => a.inicio.startsWith(hoje) && a.status !== 'cancelado').sort((a, b) => a.inicio.localeCompare(b.inicio))

  const nomeCliente = (id: string) => clientes.find(c => c.id === id)?.nome ?? 'Cliente'
  const nomeLab = (id?: string | null) => laboratorios.find(l => l.id === id)?.nome
  const subtitulo = new Date(hoje + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  const linha = (p: Pendencia) => {
    const nome = nomeCliente(p.clienteId)
    const lab = nomeLab(p.laboratorioId)
    const base = { key: p.tipo + p.id, inicio: <Avatar texto={iniciais(nome)} /> }
    switch (p.tipo) {
      case 'os_atrasada':
        return <LinhaFaixa {...base} cor="var(--erro)" aoClicar={() => irPara('ordens')} titulo={`${nome} · OS ${p.osNumero}`}
          sub={[lab, `prometida para ${formatarData(p.data)}`].filter(Boolean).join(' · ')}
          fim={<Pilula tom="erro">{plural(p.dias, 'dia', 'dias')} de atraso</Pilula>} />
      case 'parcela_vencida':
        return <LinhaFaixa {...base} cor="var(--erro)" aoClicar={() => irPara('financeiro')} titulo={`${nome} · parcela ${p.parcelaNumero}ª`}
          sub={`Crediário · OS ${p.osNumero} · venceu em ${formatarData(p.data)}`}
          fim={<Pilula tom="erro">{formatarMoeda(p.valorCentavos ?? 0)}</Pilula>} />
      case 'pronta':
        return <LinhaFaixa {...base} cor="var(--alerta)" aoClicar={() => irPara('ordens')} titulo={`${nome} · OS ${p.osNumero}`}
          sub={['Pronta, aguardando retirada', lab].filter(Boolean).join(' · ')}
          fim={<Pilula tom="alerta">Avisar cliente</Pilula>} />
      case 'proxima':
        return <LinhaFaixa {...base} cor="var(--info)" aoClicar={() => irPara('ordens')} titulo={`${nome} · OS ${p.osNumero}`}
          sub={[`Entrega prometida para ${p.dias === 0 ? 'hoje' : 'amanhã'}`, lab].filter(Boolean).join(' · ')}
          fim={<Pilula tom="info">{p.dias === 0 ? 'Hoje' : 'Amanhã'}</Pilula>} />
    }
  }

  return (
    <div>
      <PageHeader titulo="Painel" sub={`O que fazer hoje · ${subtitulo}`} />

      <FaixaResumo
        numeros={[
          { valor: r.atrasadas, rotulo: 'Entregas atrasadas', tom: r.atrasadas ? 'alerta' : undefined },
          { valor: r.entregasSemana, rotulo: 'Entregas até sábado', tom: 'dest' },
          { valor: r.parcelasVencidas, rotulo: 'Parcelas vencidas', tom: r.parcelasVencidas ? 'alerta' : undefined, detalhe: r.parcelasVencidas ? formatarMoeda(r.valorVencido) : undefined },
        ]}
        titulo="OS em aberto por etapa"
        segmentos={r.etapas.map(e => ({ rotulo: e.status === 'aguardando_retirada' ? 'Pronta p/ retirar' : STATUS_OS[e.status].rotulo, n: e.n, cor: COR_ETAPA[e.status as keyof typeof COR_ETAPA] }))}
      />

      <div className="ff-painel">
        <Card titulo={<>Para resolver <small>do mais urgente ao menos</small></>} sem_padding>
          {r.pendencias.length === 0 ? <div className="vazio">Nada pendente. Tudo em dia por aqui.</div> : (
            <>
              {r.pendencias.slice(0, MAX_LINHAS).map(linha)}
              {r.pendencias.length > MAX_LINHAS && <div className="ff-mais">e mais {r.pendencias.length - MAX_LINHAS} em Ordens de serviço e Financeiro</div>}
            </>
          )}
        </Card>

        <Card titulo={<>Agenda de hoje <small>{agendaHoje.length ? plural(agendaHoje.length, 'horário', 'horários') : ''}</small></>} sem_padding
          acoes={<button className="botao fantasma pequeno" onClick={() => irPara('agenda')}>Abrir agenda</button>}>
          {agendaHoje.length === 0 ? <div className="vazio">Nada marcado para hoje.</div> : agendaHoje.map(a => (
            <LinhaFaixa key={a.id} cor={a.status === 'realizado' ? 'var(--ok)' : 'var(--marca)'} inicio={<span className="ff-hora">{a.inicio.slice(11, 16)}</span>}
              titulo={a.clienteNome} sub={a.tipo} fim={a.status === 'realizado' ? <Pilula tom="ok">Feito</Pilula> : undefined} />
          ))}
        </Card>
      </div>

      {r.laboratorios.length > 0 && (
        <>
          <div className="ff-secao">Laboratórios</div>
          <div className="ff-grupos">
            {r.laboratorios.map((s, i) => (
              <CartaoGrupo key={s.lab.id} cor={COR_LAB[i % COR_LAB.length]} sigla={iniciais(s.lab.nome)} titulo={s.lab.nome}
                sub={`prazo combinado ${plural(s.lab.prazoDias, 'dia', 'dias')}`}
                pilula={s.noLab ? `${s.pct}% das OS` : undefined}
                total={s.noLab} rotuloTotal="no lab"
                faixas={[
                  { rotulo: 'No prazo', n: s.noPrazo, cor: 'var(--info)' },
                  { rotulo: 'Vencem em 2 dias', n: s.venceLogo, cor: 'var(--alerta)' },
                  { rotulo: 'Atrasadas', n: s.atrasadas, cor: 'var(--erro)' },
                ]}
                mini={[{ valor: s.noMes, rotulo: 'OS no mês' }, { valor: s.noAno, rotulo: 'OS no ano' }]}
                selo={s.atrasadas ? { tom: 'erro', texto: `⚠ ${plural(s.atrasadas, 'atrasada', 'atrasadas')}` }
                  : s.noLab ? { tom: 'ok', texto: '✓ tudo certo' } : undefined} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
