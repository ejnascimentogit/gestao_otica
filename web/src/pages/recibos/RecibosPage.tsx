// Recibos de pagamento (trazidos do Taskfull): número por loja, valor por extenso,
// condição de pagamento, assinatura da loja e do cliente, código de autenticidade com QR.
// Recibo emitido não muda: para corrigir, "Editar" cancela o antigo e emite outro.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Botao, Campo, Entrada, Icone, Modal, PageHeader, Selecao } from '../../components/ui'
import { QuadroAssinatura, type AssinaturaRef } from '../../components/Assinatura'
import { formatarData, formatarMoeda, hojeISO, paraCentavos, type Centavos } from '../../domain/formatos'
import {
  FORMAS_RECIBO, FORMA_CURTA_RECIBO, calcularParcelas, cnpjValido, cpfValido, formaParcelada, formatarDocumento, mascararDocumento,
  numeroRecibo, soDigitos, somarMeses, validarRecibo, valorPorExtenso, type FormaRecibo,
} from '../../domain/recibos'
import { formatarWhatsapp, linkWhatsapp, normalizarWhatsapp } from '../../domain/catalogo'
import { totalOs } from '../../domain/totais'
import {
  assinarReciboNaTela, cancelarRecibo, emitirRecibo, imagemRecibo, linkAssinaturaRecibo, podeGerenciarUsuarios, salvarDadosLoja,
  tentar, useStore, type Recibo,
  conectarWhatsapp, desconectarWhatsapp, enviarWhatsapp, estadoWhatsapp, qrWhatsapp, type EstadoWhatsapp,
} from '../../data/store'
import { comoDataUrl, pdfDeCanvas, qrDoRecibo, reciboCanvas, reciboHtml, urlAssinatura } from '../../lib/reciboDoc'
import { MODO_DEMO } from '../../lib/supabase'

const SITE = 'https://gestao-otica.ejnascimento1.workers.dev'
const origem = () => (/^https?:$/.test(window.location.protocol) && !MODO_DEMO ? window.location.origin : SITE)
const COR_FORMA: Record<FormaRecibo, string> = {
  pix: 'var(--info)', dinheiro: 'var(--ok)', debito: 'var(--destaque)', credito_vista: 'var(--acento)',
  credito_parcelado: 'var(--alerta)', crediario_loja: 'var(--marca)', transferencia: 'var(--tinta-3)',
}

export function RecibosPage() {
  const { recibosDisponivel, recibos, papel, loja } = useStore()
  const gestor = podeGerenciarUsuarios(papel)
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState<{ substituir?: Recibo } | null>(null)
  const [ver, setVer] = useState<Recibo | null>(null)
  const [assinar, setAssinar] = useState<Recibo | null>(null)
  const [dadosLoja, setDadosLoja] = useState(false)
  const [whats, setWhats] = useState(false)

  if (!recibosDisponivel) {
    return (
      <div>
        <PageHeader titulo="Recibos" sub="Recibos de pagamento com a logo da loja, valor por extenso e assinatura." />
        <div className="aviso alerta">Falta aplicar no banco a atualização dos recibos (migração 8). Depois de rodar o SQL, recarregue a página.</div>
      </div>
    )
  }

  const q = busca.trim().toLowerCase()
  const lista = recibos.filter(r => !q || r.clienteNome.toLowerCase().includes(q) || numeroRecibo(r.numero).includes(q) || r.codigo.toLowerCase().includes(q))
  const faltaDados = !soDigitos(loja.cnpj)
  const reciboAtual = (r: Recibo | null) => (r ? recibos.find(x => x.id === r.id) ?? r : null)

  return (
    <div>
      <PageHeader titulo="Recibos" sub="Recibos de pagamento com a logo da loja, o valor por extenso, a condição de pagamento e a assinatura. Recibo emitido não muda: se errar, cancele e emita outro."
        acoes={<>
          {gestor && <Botao onClick={() => setWhats(true)}>WhatsApp da loja</Botao>}
          {gestor && <Botao onClick={() => setDadosLoja(true)}>Dados da loja no recibo</Botao>}
          <Botao variante="primario" disabled={faltaDados} onClick={() => setNovo({})}>{Icone.mais} Novo recibo</Botao>
        </>} />

      {faltaDados && (
        <div className="aviso alerta" style={{ marginBottom: 12 }}>
          <span style={{ flex: 1 }}>Antes de emitir, informe o CNPJ (ou CPF) da loja em <b>Dados da loja no recibo</b>.</span>
          {gestor && <Botao pequeno onClick={() => setDadosLoja(true)}>Preencher</Botao>}
        </div>
      )}

      <FaixaDoMes recibos={recibos} />

      <div style={{ maxWidth: 360, margin: '12px 0' }}>
        <Entrada placeholder="Buscar por cliente, número ou código" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      <div className="card">
        {lista.length === 0 ? (
          <div className="vazio">{recibos.length ? 'Nenhum recibo encontrado.' : 'Nenhum recibo ainda. Toque em "Novo recibo".'}</div>
        ) : (
          <div className="tabela-wrap">
            <table className="tabela rec-tabela">
              <thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th className="col-sec">Pagamento</th><th className="num">Valor</th><th className="col-sec">Assinatura</th><th></th></tr></thead>
              <tbody>
                {lista.map(r => (
                  <tr key={r.id} className={r.status === 'cancelado' ? 'rec-cancelado' : ''} style={{ ['--c' as string]: COR_FORMA[r.forma] }}>
                    <td><b>{numeroRecibo(r.numero)}</b></td>
                    <td>{formatarData(r.dataEmissao)}</td>
                    <td>{r.clienteNome}</td>
                    <td className="col-sec"><span className="rec-chip">{FORMA_CURTA_RECIBO[r.forma]}{formaParcelada(r.forma) ? ` ${r.parcelas}×` : ''}</span></td>
                    <td className="num rec-valor">{formatarMoeda(r.valor)}</td>
                    <td className="col-sec">{r.status === 'cancelado' ? <Badge tom="erro">Cancelado</Badge> : r.assinadoEm ? <Badge tom="ok">Cliente assinou</Badge> : <span className="fraco">—</span>}</td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <Botao pequeno onClick={() => setVer(r)}>Abrir</Botao>
                      {r.status === 'emitido' && <>
                        {' '}<Botao pequeno variante="fantasma" onClick={() => setNovo({ substituir: r })}>Editar</Botao>
                        {' '}<Botao pequeno variante="fantasma" onClick={() => { if (confirm(`Cancelar o recibo nº ${numeroRecibo(r.numero)}? Ele continua na lista, marcado como cancelado, e o número não é reaproveitado.`)) tentar(() => cancelarRecibo(r.id)) }}>Cancelar</Botao>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {novo && <ModalNovoRecibo substituir={novo.substituir} aoFechar={() => setNovo(null)}
        aoEmitir={(r, querAssinar) => { setNovo(null); if (querAssinar) setAssinar(r); else setVer(r) }} />}
      {ver && <ModalVerRecibo recibo={reciboAtual(ver)!} aoFechar={() => setVer(null)}
        aoAssinar={() => { setAssinar(reciboAtual(ver)); setVer(null) }}
        aoEditar={() => { setNovo({ substituir: reciboAtual(ver)! }); setVer(null) }} />}
      {assinar && <ModalAssinarRecibo recibo={assinar} aoFechar={() => { const r = reciboAtual(assinar); setAssinar(null); setVer(r) }} />}
      {dadosLoja && <ModalDadosLoja aoFechar={() => setDadosLoja(false)} />}
      {whats && <ModalWhatsappLoja aoFechar={() => setWhats(false)} />}
    </div>
  )
}

function FaixaDoMes({ recibos }: { recibos: Recibo[] }) {
  const mes = hojeISO().slice(0, 7)
  const nomeMes = new Date(hojeISO() + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long' })
  const doMes = recibos.filter(r => r.status !== 'cancelado' && r.dataEmissao.slice(0, 7) === mes)
  if (!doMes.length) return null
  const total = doMes.reduce((a, r) => a + r.valor, 0)
  const assinados = doMes.filter(r => r.assinadoEm).length
  const partes = (Object.keys(FORMAS_RECIBO) as FormaRecibo[])
    .map(f => ({ f, v: doMes.filter(r => r.forma === f).reduce((a, r) => a + r.valor, 0) })).filter(p => p.v > 0)
  return (
    <div className="faixa-resumo">
      <div className="fr-k dest"><b>{formatarMoeda(total)}</b><span>Emitido em {nomeMes}</span></div>
      <div className="fr-k"><b>{doMes.length}</b><span>Recibos no mês</span></div>
      <div className="fr-k"><b>{assinados}</b><span>Com assinatura do cliente</span></div>
      <div className="fr-barra">{partes.map(p => <i key={p.f} style={{ flex: p.v, background: COR_FORMA[p.f] }} title={`${FORMAS_RECIBO[p.f]} · ${formatarMoeda(p.v)}`} />)}</div>
      <div className="fr-leg">{partes.map(p => <span key={p.f}><i style={{ background: COR_FORMA[p.f] }} />{FORMA_CURTA_RECIBO[p.f]} <b>{formatarMoeda(p.v)}</b></span>)}</div>
    </div>
  )
}

function DinheiroInput({ valor, aoMudar, invalida }: { valor: Centavos; aoMudar: (c: Centavos) => void; invalida?: boolean }) {
  const [txt, setTxt] = useState<string | null>(null)
  return (
    <Entrada className="num" inputMode="decimal" invalida={invalida} placeholder="0,00"
      value={txt ?? (valor ? (valor / 100).toFixed(2).replace('.', ',') : '')}
      onFocus={e => { setTxt(valor ? (valor / 100).toFixed(2).replace('.', ',') : ''); e.target.select() }}
      onChange={e => { setTxt(e.target.value); aoMudar(paraCentavos(e.target.value)) }}
      onBlur={() => setTxt(null)} />
  )
}

function ModalNovoRecibo({ substituir, aoFechar, aoEmitir }: { substituir?: Recibo; aoFechar: () => void; aoEmitir: (r: Recibo, querAssinar: boolean) => void }) {
  const { clientes, ordens } = useStore()
  const v = substituir
  const [clienteNome, setClienteNome] = useState(v?.clienteNome ?? '')
  const [clienteId, setClienteId] = useState<string | null>(v?.clienteId ?? null)
  const [documento, setDocumento] = useState(v ? mascararDocumento(v.clienteDocumento) : '')
  const [mostrarCpf, setMostrarCpf] = useState(true)
  const [osId, setOsId] = useState<string | null>(v?.osId ?? null)
  const [descricao, setDescricao] = useState(v?.descricao ?? '')
  const [valor, setValor] = useState<Centavos>(v?.valor ?? 0)
  const [data, setData] = useState(v?.dataEmissao ?? hojeISO())
  const [forma, setForma] = useState<FormaRecibo>(v?.forma ?? 'pix')
  const [parcelas, setParcelas] = useState(v && formaParcelada(v.forma) ? v.parcelas : 2)
  const [primeira, setPrimeira] = useState(v?.primeiraParcela ?? somarMeses(hojeISO(), 1))
  const [querAssinar, setQuerAssinar] = useState(false)
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const parc = formaParcelada(forma)
  const erros = validarRecibo({ cliente: clienteNome, documento, valor, forma, primeiraParcela: parc ? primeira : null })
  const mostrar = (k: string) => (tentou ? erros[k] : undefined)
  const digitosDoc = soDigitos(documento)
  const osAbertas = ordens.filter(o => o.status !== 'cancelada' && o.status !== 'orcamento')

  function escolherCliente(nome: string) {
    setClienteNome(nome)
    const c = clientes.find(x => x.nome.toLowerCase() === nome.trim().toLowerCase())
    setClienteId(c?.id ?? null)
    if (c?.cpf) setDocumento(mascararDocumento(c.cpf))
  }
  function escolherOs(id: string) {
    setOsId(id || null)
    const o = ordens.find(x => x.id === id); if (!o) return
    const c = clientes.find(x => x.id === o.clienteId)
    if (c) { setClienteNome(c.nome); setClienteId(c.id); if (c.cpf) setDocumento(mascararDocumento(c.cpf)) }
    setValor(totalOs(o.itens, o.descontoGeral))
    setDescricao(`OS nº ${o.numero}`)
  }

  async function emitir() {
    setTentou(true)
    if (Object.keys(erros).length) return
    if (v && !confirm(`Salvar vai cancelar o recibo nº ${numeroRecibo(v.numero)} e emitir um novo no lugar. Continuar?`)) return
    setSalvando(true)
    const doc = digitosDoc.length === 11 && cpfValido(digitosDoc) && !mostrarCpf ? '' : digitosDoc
    const r = await tentar(() => emitirRecibo({
      dataEmissao: data || hojeISO(), clienteId, clienteNome: clienteNome.trim(), clienteDocumento: doc, osId,
      descricao: descricao.trim(), valor, forma, parcelas: parc ? parcelas : 1, primeiraParcela: parc ? primeira : null,
    }, v?.id))
    setSalvando(false)
    if (r) aoEmitir(r, querAssinar)
  }

  return (
    <Modal titulo={v ? `Editar recibo nº ${numeroRecibo(v.numero)}` : 'Novo recibo'} aoFechar={aoFechar} rodape={<>
      <Botao onClick={aoFechar}>Cancelar</Botao>
      <Botao variante="primario" disabled={salvando} onClick={emitir}>{salvando ? 'Emitindo…' : 'Emitir recibo'}</Botao>
    </>}>
      <div style={{ display: 'grid', gap: 12 }}>
        {v && <div className="aviso alerta">Recibo emitido não muda: ao salvar, o nº {numeroRecibo(v.numero)} é cancelado e sai um recibo novo com os dados abaixo.</div>}
        {osAbertas.length > 0 && (
          <Campo rotulo="Preencher com uma OS (opcional)">
            <Selecao value={osId ?? ''} onChange={e => escolherOs(e.target.value)}>
              <option value="">Não usar OS</option>
              {osAbertas.map(o => {
                const c = clientes.find(x => x.id === o.clienteId)
                return <option key={o.id} value={o.id}>OS {o.numero} · {c?.nome ?? '—'} · {formatarMoeda(totalOs(o.itens, o.descontoGeral))}</option>
              })}
            </Selecao>
          </Campo>
        )}
        <div className="grade">
          <Campo rotulo="Cliente *" erro={mostrar('cliente')}>
            <Entrada list="rec-clientes" autoFocus invalida={!!mostrar('cliente')} value={clienteNome} onChange={e => escolherCliente(e.target.value)} placeholder="Nome de quem pagou" />
            <datalist id="rec-clientes">{clientes.map(c => <option key={c.id} value={c.nome} />)}</datalist>
          </Campo>
          <Campo rotulo="CPF ou CNPJ do cliente" erro={mostrar('documento')}>
            <Entrada inputMode="numeric" invalida={!!mostrar('documento')} value={documento} placeholder="Opcional" onChange={e => setDocumento(mascararDocumento(e.target.value))} />
          </Campo>
        </div>
        {digitosDoc.length > 0 && digitosDoc.length <= 11 && (
          <label className="chave-linha"><input type="checkbox" checked={mostrarCpf} onChange={e => setMostrarCpf(e.target.checked)} /> Mostrar o CPF no recibo <span className="fraco">(desmarcado, o CPF não é guardado)</span></label>
        )}
        <Campo rotulo="Referente a">
          <Entrada value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex.: óculos de grau, OS nº 12" />
        </Campo>
        <div className="grade">
          <Campo rotulo="Valor (R$) *" erro={mostrar('valor')}><DinheiroInput valor={valor} aoMudar={setValor} invalida={!!mostrar('valor')} /></Campo>
          <Campo rotulo="Data"><Entrada type="date" value={data} onChange={e => setData(e.target.value)} /></Campo>
          <Campo rotulo="Pagamento">
            <Selecao value={forma} onChange={e => setForma(e.target.value as FormaRecibo)}>
              {(Object.keys(FORMAS_RECIBO) as FormaRecibo[]).map(f => <option key={f} value={f}>{FORMAS_RECIBO[f]}</option>)}
            </Selecao>
          </Campo>
          {parc && <>
            <Campo rotulo="Parcelas">
              <Selecao value={parcelas} onChange={e => setParcelas(Number(e.target.value))}>
                {Array.from({ length: 23 }, (_, i) => i + 2).map(n => <option key={n} value={n}>{n}×</option>)}
              </Selecao>
            </Campo>
            <Campo rotulo="1ª parcela vence em" erro={mostrar('primeira')}><Entrada type="date" value={primeira} onChange={e => setPrimeira(e.target.value)} /></Campo>
          </>}
        </div>
        {valor > 0 && (
          <div className="fraco" style={{ fontSize: 13 }}>
            Valor por extenso: <b style={{ color: 'var(--tinta)' }}>{valorPorExtenso(valor)}</b>
            {parc && primeira && <div style={{ marginTop: 4 }}>{calcularParcelas(valor, parcelas, primeira).map(p => <div key={p.n}>{p.n}/{parcelas} · {formatarData(p.vencimento)} · {formatarMoeda(p.valor)}</div>)}</div>}
          </div>
        )}
        <label className="chave-linha"><input type="checkbox" checked={querAssinar} onChange={e => setQuerAssinar(e.target.checked)} /> O cliente vai assinar agora, na tela</label>
      </div>
    </Modal>
  )
}

async function montarHtml(r: Recibo, logoUrl?: string, assinaturaLoja?: string) {
  const [logo, loja, cliente] = await Promise.all([comoDataUrl(logoUrl), imagemRecibo(assinaturaLoja).then(comoDataUrl), imagemRecibo(r.assinaturaClientePath).then(comoDataUrl)])
  return reciboHtml(r, { logo, loja, cliente, qr: qrDoRecibo(origem(), r.codigo) }, origem().replace(/^https?:\/\//, ''))
}

function ModalVerRecibo({ recibo: r, aoFechar, aoAssinar, aoEditar }: { recibo: Recibo; aoFechar: () => void; aoAssinar: () => void; aoEditar: () => void }) {
  const { loja, clientes } = useStore()
  const frame = useRef<HTMLIFrameElement>(null)
  const [html, setHtml] = useState('')
  const [ocupado, setOcupado] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviarWa, setEnviarWa] = useState(false)

  useEffect(() => { montarHtml(r, loja.logoUrl, loja.assinaturaPath).then(setHtml) }, [r, loja.logoUrl, loja.assinaturaPath])

  const nomeArquivo = (ext: string) => `recibo-${numeroRecibo(r.numero)}.${ext}`
  const celular = useMemo(() => clientes.find(c => c.id === r.clienteId)?.celular ?? '', [clientes, r.clienteId])

  async function arquivo(tipo: 'pdf' | 'png'): Promise<Blob> {
    const canvas = await reciboCanvas(html)
    if (tipo === 'pdf') return pdfDeCanvas(canvas)
    return await new Promise<Blob>((ok, erro) => canvas.toBlob(b => (b ? ok(b) : erro(new Error('Não foi possível gerar a imagem.'))), 'image/png'))
  }
  async function baixar(tipo: 'pdf' | 'png') {
    setOcupado(tipo)
    try {
      const b = await arquivo(tipo)
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nomeArquivo(tipo); a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    } catch (e) { setAviso(e instanceof Error ? e.message : 'Não foi possível gerar o arquivo.') }
    setOcupado('')
  }
  const textoRecibo = () => `Olá, ${r.clienteNome.split(' ')[0]}! Segue o recibo nº ${numeroRecibo(r.numero)} de ${r.emissor.nome}: ${formatarMoeda(r.valor).replace(/\s/g, ' ')} (${valorPorExtenso(r.valor)}). Código do recibo: ${r.codigo}. Obrigado!`
  async function compartilhar() {
    setOcupado('share')
    try {
      const f = new File([await arquivo('pdf')], nomeArquivo('pdf'), { type: 'application/pdf' })
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
      if (nav.canShare?.({ files: [f] })) await navigator.share({ files: [f], text: textoRecibo() })
      else window.open(linkWhatsapp(celular || null, textoRecibo()), '_blank', 'noopener')
    } catch (e) { if ((e as Error)?.name !== 'AbortError') setAviso('Não foi possível compartilhar neste aparelho. Use "Baixar PDF".') }
    setOcupado('')
  }
  async function pedirAssinatura() {
    setOcupado('link')
    const token = await tentar(() => linkAssinaturaRecibo(r.id))
    setOcupado('')
    if (!token) return
    const url = urlAssinatura(origem(), token)
    const texto = `Olá, ${r.clienteNome.split(' ')[0]}! Para assinar o recibo nº ${numeroRecibo(r.numero)} de ${r.emissor.nome} (${formatarMoeda(r.valor).replace(/\s/g, ' ')}), toque no link e assine com o dedo: ${url} (vale por 7 dias).`
    window.open(linkWhatsapp(celular || null, texto), '_blank', 'noopener')
    try { await navigator.clipboard.writeText(url) } catch { /* sem permissão */ }
    setAviso('Link de assinatura copiado e WhatsApp aberto com a mensagem. Vale por 7 dias e só pode ser usado uma vez.')
  }

  const emitido = r.status === 'emitido'
  return (
    <div className="modal-fundo" onMouseDown={e => e.target === e.currentTarget && aoFechar()}>
      <div className="modal rec-ver" role="dialog" aria-label={`Recibo ${numeroRecibo(r.numero)}`}>
        <div className="card-titulo"><span>Recibo nº {numeroRecibo(r.numero)}{!emitido && ' · cancelado'}</span><Botao variante="fantasma" pequeno onClick={aoFechar}>Fechar</Botao></div>
        <div className="rec-acoes">
          <Botao pequeno onClick={() => { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print() }} disabled={!html}>Imprimir</Botao>
          <Botao pequeno onClick={() => baixar('pdf')} disabled={!html || !!ocupado}>{ocupado === 'pdf' ? 'Gerando…' : 'Baixar PDF'}</Botao>
          <Botao pequeno onClick={() => baixar('png')} disabled={!html || !!ocupado}>{ocupado === 'png' ? 'Gerando…' : 'Baixar imagem'}</Botao>
          {emitido && <Botao pequeno className="whats" onClick={() => setEnviarWa(true)} disabled={!html}>Enviar pelo WhatsApp</Botao>}
          <Botao pequeno onClick={compartilhar} disabled={!html || !!ocupado}>Compartilhar</Botao>
          {emitido && !r.assinadoEm && <>
            <Botao pequeno onClick={aoAssinar}>Assinar na tela</Botao>
            <Botao pequeno onClick={pedirAssinatura} disabled={!!ocupado}>Pedir assinatura por link</Botao>
          </>}
          {emitido && <Botao pequeno variante="fantasma" onClick={aoEditar}>Editar</Botao>}
        </div>
        {aviso && <div className="aviso info" style={{ margin: '0 16px 10px' }}><span style={{ flex: 1 }}>{aviso}</span><Botao pequeno variante="fantasma" onClick={() => setAviso('')}>Fechar</Botao></div>}
        <div className="rec-folha">{html ? <iframe ref={frame} title="Recibo" srcDoc={html} /> : <div className="vazio">Montando o recibo…</div>}</div>
      </div>
      {enviarWa && <ModalEnviarWhatsapp recibo={r} celular={celular} texto={textoRecibo()} gerar={arquivo} nomeArquivo={nomeArquivo}
        aoFechar={() => setEnviarWa(false)} aoEnviar={m => { setEnviarWa(false); setAviso(m) }} />}
    </div>
  )
}

/** Envia o recibo (PDF ou imagem) pelo WhatsApp conectado da loja, sem precisar baixar e anexar */
function ModalEnviarWhatsapp({ recibo: r, celular, texto: textoInicial, gerar, nomeArquivo, aoFechar, aoEnviar }: {
  recibo: Recibo; celular: string; texto: string; gerar: (t: 'pdf' | 'png') => Promise<Blob>; nomeArquivo: (ext: string) => string
  aoFechar: () => void; aoEnviar: (msg: string) => void
}) {
  const { papel } = useStore()
  const [estado, setEstado] = useState<EstadoWhatsapp | null>(null)
  const [erroEstado, setErroEstado] = useState('')
  const [numero, setNumero] = useState(celular ? formatarWhatsapp(normalizarWhatsapp(celular) ?? celular) : '')
  const [texto, setTexto] = useState(textoInicial)
  const [anexo, setAnexo] = useState<'pdf' | 'png' | 'nada'>('pdf')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [conectar, setConectar] = useState(false)

  const carregar = () => estadoWhatsapp().then(setEstado).catch(e => setErroEstado(e instanceof Error ? e.message : String(e)))
  useEffect(() => { carregar() }, [])

  async function enviar() {
    setErro('')
    if (!normalizarWhatsapp(numero)) { setErro('Número com DDD, ex.: (81) 99876-5432.'); return }
    if (!texto.trim()) { setErro('Escreva a mensagem.'); return }
    setEnviando(true)
    try {
      const arquivo = anexo === 'nada' ? undefined
        : { nome: nomeArquivo(anexo), tipo: anexo === 'pdf' ? 'application/pdf' : 'image/png', blob: await gerar(anexo) }
      await enviarWhatsapp({ telefone: numero, nome: r.clienteNome, texto, reciboId: r.id, arquivo })
      aoEnviar(`Recibo nº ${numeroRecibo(r.numero)} enviado pelo WhatsApp para ${numero}.`)
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível enviar.') }
    setEnviando(false)
  }

  if (conectar) return <ModalWhatsappLoja aoFechar={() => { setConectar(false); carregar() }} />
  const conectado = estado?.status === 'conectada'
  return (
    <Modal titulo={`Enviar recibo nº ${numeroRecibo(r.numero)} pelo WhatsApp`} aoFechar={aoFechar} rodape={<>
      <Botao onClick={aoFechar}>Cancelar</Botao>
      {conectado && <Botao className="whats" disabled={enviando} onClick={enviar}>{enviando ? 'Enviando…' : 'Enviar agora'}</Botao>}
    </>}>
      {!estado && !erroEstado && <div className="vazio">Verificando o WhatsApp da loja…</div>}
      {erroEstado && <div className="aviso alerta">{erroEstado}</div>}
      {estado && !conectado && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="aviso alerta">{!estado.configurado ? 'O servidor do WhatsApp ainda não foi configurado.' : 'O WhatsApp da loja não está conectado.'}</div>
          {estado.configurado && (podeGerenciarUsuarios(papel)
            ? <Botao variante="primario" onClick={() => setConectar(true)}>Conectar o WhatsApp da loja</Botao>
            : <p className="muted" style={{ margin: 0 }}>Peça ao administrador ou gerente para conectar o WhatsApp da loja em Recibos → WhatsApp da loja.</p>)}
          <p className="fraco" style={{ margin: 0 }}>Enquanto isso, use "Compartilhar" no recibo para mandar pelo WhatsApp do celular.</p>
        </div>
      )}
      {estado && conectado && (
        <div style={{ display: 'grid', gap: 12 }}>
          <p className="fraco" style={{ margin: 0 }}>Sai do WhatsApp da loja ({formatarWhatsapp(estado.telefone)}) · {estado.enviadasHoje} de {estado.limite} mensagens hoje.</p>
          <Campo rotulo="WhatsApp do cliente">
            <Entrada type="tel" inputMode="tel" autoFocus={!numero} placeholder="(81) 99876-5432" value={numero} onChange={e => setNumero(e.target.value)} />
          </Campo>
          <Campo rotulo="Mensagem">
            <textarea className="entrada" rows={4} maxLength={1500} value={texto} onChange={e => setTexto(e.target.value)} />
          </Campo>
          <Campo rotulo="Anexo">
            <Selecao value={anexo} onChange={e => setAnexo(e.target.value as 'pdf' | 'png' | 'nada')}>
              <option value="pdf">Recibo em PDF</option>
              <option value="png">Recibo em imagem</option>
              <option value="nada">Sem anexo (só a mensagem)</option>
            </Selecao>
          </Campo>
          {erro && <p style={{ color: 'var(--erro)', margin: 0 }}>{erro}</p>}
        </div>
      )}
    </Modal>
  )
}

/** Conexão do WhatsApp da loja por QR (WuzAPI) */
function ModalWhatsappLoja({ aoFechar }: { aoFechar: () => void }) {
  const [estado, setEstado] = useState<EstadoWhatsapp | null>(null)
  const [erro, setErro] = useState('')
  const [aceite, setAceite] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [aguardando, setAguardando] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const carregar = () => estadoWhatsapp().then(e => { setEstado(e); setAguardando(e.status === 'aguardando_qr') }).catch(e => setErro(e instanceof Error ? e.message : String(e)))
  useEffect(() => { carregar() }, [])

  // enquanto espera a leitura do QR, pergunta a cada 3 s
  useEffect(() => {
    if (!aguardando) return
    let vivo = true
    const passo = async () => {
      try {
        const r = await qrWhatsapp()
        if (!vivo) return
        if (r.conectada) { setAguardando(false); setQr(null); carregar(); return }
        setQr(r.qr)
      } catch (e) { if (vivo) setErro(e instanceof Error ? e.message : String(e)) }
    }
    passo()
    const id = setInterval(passo, 3000)
    return () => { vivo = false; clearInterval(id) }
  }, [aguardando])

  async function conectar() {
    setErro(''); setOcupado(true)
    try { await conectarWhatsapp(); setAguardando(true) } catch (e) { setErro(e instanceof Error ? e.message : String(e)) }
    setOcupado(false)
  }
  async function desconectar() {
    if (!confirm('Desconectar o WhatsApp da loja? Os recibos deixam de sair por ele até conectar de novo.')) return
    setOcupado(true)
    try { await desconectarWhatsapp(); await carregar() } catch (e) { setErro(e instanceof Error ? e.message : String(e)) }
    setOcupado(false)
  }

  return (
    <Modal titulo="WhatsApp da loja" aoFechar={aoFechar}>
      <div style={{ display: 'grid', gap: 12 }}>
        {!estado && !erro && <div className="vazio">Verificando…</div>}
        {erro && <div className="aviso alerta">{erro}</div>}
        {estado && !estado.configurado && <div className="aviso alerta">O servidor do WhatsApp ainda não foi configurado no Supabase (segredos WUZAPI_URL e WUZAPI_ADMIN_TOKEN).</div>}
        {estado?.status === 'conectada' && (
          <>
            <div className="aviso ok"><span style={{ flex: 1 }}>Conectado ao WhatsApp {formatarWhatsapp(estado.telefone)} · {estado.enviadasHoje} de {estado.limite} mensagens hoje.</span></div>
            <div><Botao disabled={ocupado} onClick={desconectar}>Desconectar</Botao></div>
          </>
        )}
        {estado?.configurado && estado.status !== 'conectada' && !aguardando && (
          <>
            <p className="muted" style={{ margin: 0 }}>Conecte o WhatsApp da loja lendo um QR code, como no WhatsApp Web. Depois disso, o recibo sai em PDF direto para o cliente, sem baixar e anexar.</p>
            <div className="aviso info" style={{ display: 'block' }}>
              <b>Antes de conectar:</b> esta conexão funciona como o WhatsApp Web, mas não é a API oficial do WhatsApp. Enviar muitas mensagens para quem não tem o número da loja pode levar o WhatsApp a <b>bloquear o número</b>. Por isso há um limite de {estado.limite} mensagens por dia. Use só para clientes que compraram na loja.
            </div>
            <label className="chave-linha"><input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)} /> Entendi e quero conectar o WhatsApp da loja</label>
            <div><Botao variante="primario" disabled={!aceite || ocupado} onClick={conectar}>{ocupado ? 'Conectando…' : 'Conectar'}</Botao></div>
          </>
        )}
        {aguardando && (
          <div style={{ display: 'grid', gap: 10, justifyItems: 'center', textAlign: 'center' }}>
            <p className="muted" style={{ margin: 0 }}>No celular da loja, abra o WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar aparelho</b> e aponte para o código.</p>
            <div className="wa-qr">{qr ? <img src={qr} alt="QR code para conectar o WhatsApp" /> : <span className="fraco">Gerando o código…</span>}</div>
            <span className="fraco">O código muda sozinho a cada poucos segundos.</span>
          </div>
        )}
      </div>
    </Modal>
  )
}

function ModalAssinarRecibo({ recibo: r, aoFechar }: { recibo: Recibo; aoFechar: () => void }) {
  const quadro = useRef<AssinaturaRef>(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  async function salvar() {
    if (!quadro.current?.temTraco()) { setErro('O cliente precisa assinar no quadro.'); return }
    setSalvando(true)
    const b = await quadro.current.png()
    const ok = b && await tentar(() => assinarReciboNaTela(r.id, b))
    setSalvando(false)
    if (ok !== null) aoFechar()
  }
  return (
    <Modal titulo="Assinatura do cliente" aoFechar={aoFechar} rodape={<>
      <Botao onClick={() => { quadro.current?.limpar(); setErro('') }}>Limpar</Botao>
      <Botao variante="primario" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar assinatura'}</Botao>
    </>}>
      <p className="muted" style={{ marginTop: 0 }}>{r.clienteNome} · Recibo nº {numeroRecibo(r.numero)} · {formatarMoeda(r.valor)}</p>
      <QuadroAssinatura ref={quadro} altura={240} />
      {erro && <p style={{ color: 'var(--erro)', marginBottom: 0 }}>{erro}</p>}
      <p className="fraco" style={{ marginBottom: 0 }}>Depois de salva, a assinatura não pode ser trocada.</p>
    </Modal>
  )
}

const CORES_RECIBO = ['#7a2e4d', '#2E4A3A', '#0E5C58', '#1F3A5F', '#B4773F', '#1D2A2A']

function ModalDadosLoja({ aoFechar }: { aoFechar: () => void }) {
  const { loja } = useStore()
  const [cnpj, setCnpj] = useState(mascararDocumento(loja.cnpj || ''))
  const [telefone, setTelefone] = useState(loja.telefone || '')
  const [email, setEmail] = useState(loja.email || '')
  const [endereco, setEndereco] = useState(loja.endereco || '')
  const [redes, setRedes] = useState(loja.redesSociais || '')
  const [cor, setCor] = useState(loja.corRecibo || '#7a2e4d')
  const [assAtual, setAssAtual] = useState<string | null>(null)
  const [novaAss, setNovaAss] = useState<Blob | null | undefined>(undefined) // undefined = não mexeu; null = remover
  const [desenhar, setDesenhar] = useState(false)
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const quadro = useRef<AssinaturaRef>(null)
  const arquivo = useRef<HTMLInputElement>(null)

  useEffect(() => { imagemRecibo(loja.assinaturaPath).then(setAssAtual) }, [loja.assinaturaPath])
  const dig = soDigitos(cnpj)
  const docErro = !dig ? 'Informe o CNPJ ou CPF.' : (dig.length === 11 ? cpfValido(dig) : dig.length === 14 && cnpjValido(dig)) ? undefined : 'Documento inválido.'

  async function importar(f?: File) {
    if (!f) return
    const { prepararImagemProvador } = await import('../../lib/imagem')
    const b = await tentar(() => prepararImagemProvador(f, 900))
    if (b) { setNovaAss(b); setAssAtual(URL.createObjectURL(b)); setDesenhar(false) }
  }
  async function salvar() {
    setTentou(true)
    if (docErro) return
    let ass = novaAss
    if (desenhar) {
      if (!quadro.current?.temTraco()) { setDesenhar(false) } else ass = await quadro.current.png()
    }
    setSalvando(true)
    const ok = await tentar(() => salvarDadosLoja({ cnpj: formatarDocumento(cnpj), telefone, email, endereco, redesSociais: redes, corRecibo: cor }, ass))
    setSalvando(false)
    if (ok !== null) aoFechar()
  }

  return (
    <Modal titulo="Dados da loja no recibo" aoFechar={aoFechar} rodape={<>
      <Botao onClick={aoFechar}>Cancelar</Botao>
      <Botao variante="primario" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar'}</Botao>
    </>}>
      <div style={{ display: 'grid', gap: 12 }}>
        <p className="fraco" style={{ margin: 0 }}>Aparecem no topo de todo recibo novo. Recibos já emitidos guardam os dados da época.</p>
        <div className="grade">
          <Campo rotulo="Nome da loja"><Entrada value={loja.nome} disabled /></Campo>
          <Campo rotulo="CNPJ ou CPF *" erro={tentou ? docErro : undefined}><Entrada inputMode="numeric" value={cnpj} invalida={tentou && !!docErro} onChange={e => setCnpj(mascararDocumento(e.target.value))} /></Campo>
          <Campo rotulo="Telefone / WhatsApp"><Entrada type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} /></Campo>
          <Campo rotulo="E-mail"><Entrada type="email" value={email} onChange={e => setEmail(e.target.value)} /></Campo>
        </div>
        <Campo rotulo="Endereço"><Entrada value={endereco} placeholder="Rua, número, bairro · cidade/UF · CEP" onChange={e => setEndereco(e.target.value)} /></Campo>
        <Campo rotulo="Instagram / redes sociais"><Entrada value={redes} placeholder="@sualoja" onChange={e => setRedes(e.target.value)} /></Campo>
        <Campo rotulo="Cor do recibo" composto>
          <div className="linha" style={{ gap: 8 }}>
            {CORES_RECIBO.map(c => <button key={c} type="button" className="rec-cor" aria-pressed={cor.toLowerCase() === c.toLowerCase()} style={{ background: c }} onClick={() => setCor(c)} aria-label={`Cor ${c}`} />)}
            <input type="color" value={cor} onChange={e => setCor(e.target.value)} aria-label="Outra cor" style={{ width: 40, height: 32, border: 0, background: 'none' }} />
          </div>
        </Campo>
        <Campo rotulo="Assinatura da loja (entra em todo recibo)" composto>
          {desenhar ? (
            <div style={{ display: 'grid', gap: 6 }}>
              <QuadroAssinatura ref={quadro} altura={180} />
              <div className="linha"><Botao pequeno onClick={() => quadro.current?.limpar()}>Limpar</Botao><Botao pequeno variante="fantasma" onClick={() => setDesenhar(false)}>Voltar</Botao></div>
            </div>
          ) : (
            <div className="linha" style={{ gap: 12 }}>
              <span className="rec-ass">{assAtual && novaAss !== null ? <img src={assAtual} alt="Assinatura da loja" /> : <span className="fraco">Sem assinatura</span>}</span>
              <div style={{ display: 'grid', gap: 6 }}>
                <Botao pequeno onClick={() => setDesenhar(true)}>Desenhar</Botao>
                <Botao pequeno onClick={() => arquivo.current?.click()}>Importar foto</Botao>
                {(assAtual && novaAss !== null) && <Botao pequeno variante="fantasma" onClick={() => { setNovaAss(null); setAssAtual(null) }}>Remover</Botao>}
                <input ref={arquivo} type="file" accept="image/*" hidden onChange={e => { importar(e.target.files?.[0]); e.target.value = '' }} />
              </div>
            </div>
          )}
        </Campo>
      </div>
    </Modal>
  )
}
