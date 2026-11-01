// Página pública do recibo (sem login): /recibo?t=<token> assina; /recibo?c=<código> confere.
import { useEffect, useRef, useState } from 'react'
import { Botao, Entrada } from '../../components/ui'
import { QuadroAssinatura, type AssinaturaRef } from '../../components/Assinatura'
import { formatarData, formatarMoeda } from '../../domain/formatos'
import { FORMAS_RECIBO, formatarDocumento, formaParcelada, numeroRecibo, type FormaRecibo } from '../../domain/recibos'
import * as repo from '../../data/repo'

type Dados = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
const quando = (iso?: string) => iso ? new Date(iso).toLocaleDateString('pt-BR') + ' às ' + new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''
const valor = (v: number) => formatarMoeda(Math.round(Number(v) * 100))
const pagamento = (d: Dados) => (FORMAS_RECIBO[d.forma_pagamento as FormaRecibo] ?? d.forma_pagamento) + (formaParcelada(d.forma_pagamento) ? ` · ${d.parcelas}×` : '')

export function ReciboPublicoPage() {
  const q = new URLSearchParams(window.location.search)
  const token = q.get('t'), codigo = q.get('c')
  useEffect(() => { document.title = token ? 'Assinar recibo' : 'Conferência de recibo' }, [token])
  return (
    <div className="pub">
      <header className="pub-topo"><div className="pub-topo-in"><h1 style={{ fontSize: 18 }}>Recibo</h1></div></header>
      <main className="pub-corpo" style={{ maxWidth: 560 }}>
        {token ? <Assinar token={token.trim()} /> : codigo ? <Conferir codigo={codigo.trim()} /> : <Codigo />}
      </main>
    </div>
  )
}

function Codigo({ erro }: { erro?: string }) {
  const [c, setC] = useState('')
  return (
    <div className="card"><div className="card-corpo" style={{ display: 'grid', gap: 10 }}>
      <b style={{ fontSize: 18 }}>Conferir um recibo</b>
      <p className="muted" style={{ margin: 0 }}>Digite o código que aparece no rodapé do recibo (ou leia o QR code).</p>
      <Entrada value={c} maxLength={12} placeholder="CÓDIGO" style={{ textTransform: 'uppercase', letterSpacing: '.1em' }} onChange={e => setC(e.target.value)} />
      <Botao variante="primario" onClick={() => { if (c.trim()) window.location.search = '?c=' + encodeURIComponent(c.trim()) }}>Conferir</Botao>
      {erro && <p style={{ color: 'var(--erro)', margin: 0 }}>{erro}</p>}
    </div></div>
  )
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return <div className="rec-pub-linha"><span>{rotulo}</span><b>{children}</b></div>
}

function Conferir({ codigo }: { codigo: string }) {
  const [d, setD] = useState<Dados | null | 'erro'>(null)
  useEffect(() => { repo.verificarRecibo(codigo).then(setD).catch(() => setD('erro')) }, [codigo])
  if (d === null) return <div className="vazio">Consultando…</div>
  if (d === 'erro') return <Codigo erro="Não foi possível consultar agora. Tente de novo em instantes." />
  if (!d.encontrado) return <Codigo erro="Nenhum recibo encontrado com esse código." />
  const cancelado = d.status === 'cancelado'
  const selo = !d.integro ? <span className="badge tom-erro">Os dados NÃO conferem com o original</span>
    : cancelado ? <span className="badge tom-alerta">Recibo autêntico, mas CANCELADO</span> : <span className="badge tom-ok">Recibo autêntico</span>
  return (
    <div className="card"><div className="card-corpo" style={{ display: 'grid', gap: 8 }}>
      <div>{selo}</div>
      <b style={{ fontSize: 20 }}>Recibo nº {numeroRecibo(d.numero)}</b>
      <div style={{ fontSize: 28, fontWeight: 800 }}>{valor(d.valor)}</div>
      <Linha rotulo="Emitido por">{d.emissor_nome}{d.emissor_documento && <small className="fraco" style={{ display: 'block', fontWeight: 400 }}>{d.emissor_documento.length === 14 ? formatarDocumento(d.emissor_documento) : d.emissor_documento}</small>}</Linha>
      <Linha rotulo="Recebido de">{d.cliente_nome}</Linha>
      <Linha rotulo="Data">{formatarData(d.data_emissao)}</Linha>
      <Linha rotulo="Pagamento">{pagamento(d)}</Linha>
      <Linha rotulo="Assinatura do cliente">{d.assinado ? `Sim · ${quando(d.assinado_em)}${d.assinado_via === 'link' ? ' (por link)' : ''}` : 'Não houve'}</Linha>
      {cancelado && <Linha rotulo="Cancelado em">{quando(d.cancelado_em)}</Linha>}
      <p className="fraco" style={{ margin: '8px 0 0' }}>A conferência recalcula a “impressão digital” (SHA-256) do recibo a partir dos dados guardados e compara com a gravada na emissão. Se qualquer dado fosse alterado, ela deixaria de bater.</p>
      <p className="fraco" style={{ margin: 0, fontFamily: 'Consolas, monospace', wordBreak: 'break-all' }}>{d.hash}</p>
      <p className="fraco" style={{ margin: 0 }}>Recibo de pagamento: não substitui nota fiscal.</p>
    </div></div>
  )
}

const ERROS: Record<string, string> = { invalido: 'Este link não é válido.', usado: 'Este recibo já foi assinado. Obrigado!', cancelado: 'Este recibo foi cancelado.', expirado: 'Este link expirou. Peça um novo a quem emitiu o recibo.' }

function Assinar({ token }: { token: string }) {
  const [d, setD] = useState<Dados | null | 'erro'>(null)
  const [msg, setMsg] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [feito, setFeito] = useState(false)
  const quadro = useRef<AssinaturaRef>(null)
  useEffect(() => { repo.dadosLinkRecibo(token).then(setD).catch(() => setD('erro')) }, [token])
  if (d === null) return <div className="vazio">Abrindo…</div>
  if (d === 'erro') return <div className="card"><div className="card-corpo"><b>Não foi possível abrir.</b> Tente de novo em instantes.</div></div>
  if (d.erro) return <div className="card"><div className="card-corpo"><b style={{ fontSize: 18 }}>{ERROS[d.erro] ?? 'Link indisponível.'}</b></div></div>
  if (feito) return <div className="card"><div className="card-corpo" style={{ display: 'grid', gap: 8 }}><span className="badge tom-ok" style={{ justifySelf: 'start' }}>Assinado</span><b style={{ fontSize: 20 }}>Obrigado!</b><p className="muted" style={{ margin: 0 }}>Sua assinatura foi registrada no recibo. Você já pode fechar esta página.</p></div></div>

  async function enviar() {
    if (!quadro.current?.temTraco()) { setMsg('Desenhe a sua assinatura no quadro.'); return }
    setEnviando(true); setMsg('')
    try {
      const r = await repo.assinarReciboPeloLink(token, quadro.current.dataUrl())
      if (r.ok) setFeito(true); else setMsg(r.erro || 'Não foi possível assinar.')
    } catch { setMsg('Sem conexão. Tente de novo.') }
    setEnviando(false)
  }
  return (
    <>
      <div className="card"><div className="card-corpo" style={{ display: 'grid', gap: 8 }}>
        <b style={{ fontSize: 20 }}>Assinar recibo nº {numeroRecibo(d.numero)}</b>
        <p className="muted" style={{ margin: 0 }}>Confira os dados e assine com o dedo no quadro abaixo.</p>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{valor(d.valor)}</div>
        <Linha rotulo="Emitido por">{d.emissor_nome}</Linha>
        <Linha rotulo="Recebido de">{d.cliente_nome}</Linha>
        <Linha rotulo="Data">{formatarData(d.data_emissao)}</Linha>
        <Linha rotulo="Pagamento">{pagamento(d)}</Linha>
        {d.descricao && <Linha rotulo="Referente a">{d.descricao}</Linha>}
      </div></div>
      <div className="card"><div className="card-corpo" style={{ display: 'grid', gap: 10 }}>
        <QuadroAssinatura ref={quadro} altura={220} />
        <div className="linha"><Botao onClick={() => quadro.current?.limpar()}>Limpar</Botao><Botao variante="primario" style={{ flex: 1 }} disabled={enviando} onClick={enviar}>{enviando ? 'Enviando…' : 'Assinar'}</Botao></div>
        {msg && <p style={{ color: 'var(--erro)', margin: 0 }}>{msg}</p>}
        <p className="fraco" style={{ margin: 0 }}>Ao assinar, o seu desenho, a data, a hora e o endereço de rede (IP) deste aparelho ficam registrados no recibo.</p>
      </div></div>
    </>
  )
}
