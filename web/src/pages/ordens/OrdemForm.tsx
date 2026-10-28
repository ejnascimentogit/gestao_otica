import { useMemo, useState } from 'react'
import { Badge, Botao, Card, Campo, Entrada, Icone, Modal, PageHeader, Selecao } from '../../components/ui'
import { formatarData, formatarMoeda, hojeISO, paraCentavos, somarDias } from '../../domain/formatos'
import { receitaVazia } from '../../domain/receita'
import { quantidadeSugerida, subtotal, totalItem, totalOs, type ItemOs } from '../../domain/totais'
import { simularCrediario, type MetodoJuros } from '../../domain/crediario'
import {
  FORMAS, STATUS_OS, gerarParcelas, novoId, salvarCliente, salvarOs, tentar, useStore,
  type FormaPagamento, type OrdemServico, type StatusOs,
} from '../../data/store'
import { ReceitaForm } from './ReceitaForm'
import { ImpressaoOs } from './ImpressaoOs'
import { ImpressaoPromissoria } from './ImpressaoPromissoria'

export function novaOs(): OrdemServico {
  return {
    id: novoId(), numero: 0, clienteId: '', vendedorId: '', laboratorioId: null, status: 'aberta',
    dataOs: hojeISO(), previsao: null, controleInterno: '', observacoes: '', receita: receitaVazia(),
    itens: [], descontoGeral: 0, pagamentos: [], crediario: null,
  }
}

export function OrdemForm({ inicial, aoVoltar }: { inicial: OrdemServico; aoVoltar: () => void }) {
  const { clientes, vendedores, laboratorios, produtos, parcelas } = useStore()
  const [os, setOs] = useState<OrdemServico>(structuredClone(inicial))
  const [busca, setBusca] = useState('')
  const [buscaProd, setBuscaProd] = useState('')
  const [modal, setModal] = useState<null | 'cliente' | 'entrada' | 'finalizar'>(null)
  const [imprimir, setImprimir] = useState<null | 'os' | 'promissoria'>(null)
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)

  const cliente = clientes.find(c => c.id === os.clienteId)
  const total = totalOs(os.itens, os.descontoGeral)
  const pago = os.pagamentos.reduce((s, p) => s + p.valor, 0)
  const saldo = Math.max(0, total - pago)
  const parcelasOs = parcelas.filter(p => p.osNumero === os.numero && os.numero > 0)

  const sugestoesCliente = busca.length >= 2
    ? clientes.filter(c => (c.nome + c.cpf + c.celular).toLowerCase().includes(busca.toLowerCase())).slice(0, 6)
    : []
  const sugestoesProd = buscaProd.length >= 2
    ? produtos.filter(p => p.ativo && (p.descricao + ' ' + (p.codigo ?? '')).toLowerCase().includes(buscaProd.toLowerCase())).slice(0, 6)
    : []

  const upd = (patch: Partial<OrdemServico>) => setOs(o => ({ ...o, ...patch }))

  function adicionarProduto(pid: string) {
    const p = produtos.find(x => x.id === pid)!
    const item: ItemOs = { id: novoId(), produtoId: p.id, descricao: p.descricao, unidade: p.unidade, quantidade: quantidadeSugerida(p.tipo, p.unidade), valorUnitario: p.preco, desconto: 0 }
    upd({ itens: [...os.itens, item] })
    setBuscaProd('')
  }

  function mudarItem(id: string, patch: Partial<ItemOs>) {
    upd({ itens: os.itens.map(i => (i.id === id ? { ...i, ...patch } : i)) })
  }

  function validarParaStatus(s: StatusOs): string | null {
    if (!os.clienteId) return 'Selecione o cliente.'
    if (s === 'em_laboratorio') {
      if (!os.laboratorioId) return 'Informe o laboratório de destino.'
      if (os.receita.lidaPorIa && !os.receita.conferida) return 'Confira a receita lida pela IA antes de enviar ao laboratório.'
    }
    return null
  }

  async function salvar(o = os): Promise<OrdemServico | null> {
    const erro = validarParaStatus(o.status)
    if (erro) { setMsg(erro); return null }
    setSalvando(true)
    const salva = await tentar(() => salvarOs(o))
    setSalvando(false)
    if (!salva) { setMsg('Não foi possível salvar. Veja o erro no topo da tela.'); return null }
    setOs(salva)
    setMsg(`OS nº ${salva.numero} salva.`)
    return salva
  }

  function mudarStatus(s: StatusOs) {
    if (s === 'finalizada') { setModal('finalizar'); return }
    const erro = validarParaStatus(s)
    if (erro) { setMsg(erro); return }
    upd({ status: s })
  }

  if (imprimir) {
    return (
      <div>
        <div className="linha nao-imprimir" style={{ marginBottom: 16 }}>
          <Botao onClick={() => setImprimir(null)}>{Icone.voltar} Voltar à OS</Botao>
          <Botao variante="primario" onClick={() => window.print()}>{Icone.imprimir} Imprimir</Botao>
        </div>
        {imprimir === 'os' ? <ImpressaoOs os={os} /> : <ImpressaoPromissoria os={os} />}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        titulo={os.numero ? `Ordem de serviço nº ${os.numero}` : 'Nova ordem de serviço'}
        sub={<Badge tom={STATUS_OS[os.status].tom}>{STATUS_OS[os.status].rotulo}</Badge>}
        acoes={<>
          <Botao onClick={aoVoltar}>{Icone.voltar} Voltar</Botao>
          {os.numero > 0 && <Botao onClick={() => setImprimir('os')}>{Icone.imprimir} Imprimir 3 vias</Botao>}
          {parcelasOs.length > 0 && <Botao onClick={() => setImprimir('promissoria')}>{Icone.imprimir} Promissória</Botao>}
        </>}
      />

      {msg && <div className="aviso info" style={{ marginBottom: 16 }}><span style={{ flex: 1 }}>{msg}</span><Botao pequeno variante="fantasma" onClick={() => setMsg('')}>ok</Botao></div>}

      <div className="duas-colunas">
        <div>
          <Card titulo="Dados da OS">
            <div className="grade">
              <Campo rotulo="Cliente" composto style={{ gridColumn: '1 / -1', position: 'relative' }}>
                {cliente ? (
                  <div className="linha">
                    <div style={{ flex: 1 }}><b>{cliente.nome}</b><div className="fraco">{cliente.cpf} · {cliente.celular}</div></div>
                    <Botao pequeno onClick={() => upd({ clienteId: '' })}>Trocar</Botao>
                  </div>
                ) : (
                  <div className="linha">
                    <div style={{ flex: 1, position: 'relative' }}>
                      <Entrada placeholder="Buscar por nome, CPF ou celular" value={busca} onChange={e => setBusca(e.target.value)} />
                      {sugestoesCliente.length > 0 && (
                        <div className="card" style={{ position: 'absolute', left: 0, right: 0, top: 40, zIndex: 5 }}>
                          {sugestoesCliente.map(c => (
                            <div key={c.id} className="menu-item" onClick={() => { upd({ clienteId: c.id }); setBusca('') }}>
                              <div><b>{c.nome}</b><div className="fraco">{c.cpf} · {c.celular}</div></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Botao onClick={() => setModal('cliente')}>{Icone.mais} Novo cliente</Botao>
                  </div>
                )}
              </Campo>
              <Campo rotulo="Vendedor">
                <Selecao value={os.vendedorId} onChange={e => upd({ vendedorId: e.target.value })}>
                  <option value="">Selecione</option>
                  {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </Selecao>
              </Campo>
              <Campo rotulo="Status">
                <Selecao value={os.status} onChange={e => mudarStatus(e.target.value as StatusOs)}>
                  {(Object.keys(STATUS_OS) as StatusOs[]).map(s => <option key={s} value={s}>{STATUS_OS[s].rotulo}</option>)}
                </Selecao>
              </Campo>
              <Campo rotulo="Data da OS"><Entrada type="date" value={os.dataOs} onChange={e => upd({ dataOs: e.target.value })} /></Campo>
              <Campo rotulo="Previsão de entrega"><Entrada type="date" value={os.previsao ?? ''} onChange={e => upd({ previsao: e.target.value || null })} /></Campo>
              <Campo rotulo="Laboratório">
                <Selecao value={os.laboratorioId ?? ''} onChange={e => {
                  const lab = laboratorios.find(l => l.id === e.target.value)
                  upd({ laboratorioId: e.target.value || null, previsao: os.previsao ?? (lab ? somarDias(os.dataOs, lab.prazoDias) : null) })
                }}>
                  <option value="">Selecione</option>
                  {laboratorios.filter(l => l.ativo || l.id === os.laboratorioId).map(l => <option key={l.id} value={l.id}>{l.nome} ({l.prazoDias} dias)</option>)}
                </Selecao>
              </Campo>
              <Campo rotulo="Controle interno"><Entrada value={os.controleInterno} placeholder="Opcional" onChange={e => upd({ controleInterno: e.target.value })} /></Campo>
            </div>
          </Card>

          <Card titulo="Receita óptica">
            <ReceitaForm receita={os.receita} aoMudar={r => upd({ receita: r })} />
          </Card>

          <Card titulo="Produtos e serviços" sem_padding>
            <div className="card-corpo" style={{ position: 'relative' }}>
              <Entrada placeholder="Buscar produto por nome ou código" value={buscaProd} onChange={e => setBuscaProd(e.target.value)} />
              {sugestoesProd.length > 0 && (
                <div className="card" style={{ position: 'absolute', left: 16, right: 16, top: 56, zIndex: 5 }}>
                  {sugestoesProd.map(p => (
                    <div key={p.id} className="menu-item" onClick={() => adicionarProduto(p.id)}>
                      <div style={{ flex: 1 }}>{p.descricao}<div className="fraco">{p.marca} · vendido por {p.unidade === 'PAR' ? 'par' : 'unidade'}</div></div>
                      <b>{formatarMoeda(p.preco)}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {os.itens.length === 0 ? <div className="vazio">Nenhum item. Busque um produto acima.</div> : (
              <div className="tabela-wrap">
                <table className="tabela">
                  <thead><tr><th>Item</th><th>Un.</th><th className="num">Qtd</th><th className="num">Valor unit.</th><th className="num">Desconto</th><th className="num">Total</th><th /></tr></thead>
                  <tbody>
                    {os.itens.map(i => (
                      <tr key={i.id}>
                        <td>{i.descricao}</td>
                        <td>{i.unidade}</td>
                        <td className="num" style={{ width: 80 }}><Entrada className="num" type="number" min={1} value={i.quantidade} onChange={e => mudarItem(i.id, { quantidade: Math.max(1, Number(e.target.value)) })} /></td>
                        <td className="num" style={{ width: 120 }}><MoedaInput valor={i.valorUnitario} aoMudar={v => mudarItem(i.id, { valorUnitario: v })} /></td>
                        <td className="num" style={{ width: 110 }}><MoedaInput valor={i.desconto} aoMudar={v => mudarItem(i.id, { desconto: v })} /></td>
                        <td className="num"><b>{formatarMoeda(totalItem(i))}</b></td>
                        <td><Botao pequeno variante="fantasma" aria-label="Remover" onClick={() => upd({ itens: os.itens.filter(x => x.id !== i.id) })}>{Icone.lixo}</Botao></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="card-corpo fraco" style={{ borderTop: '1px solid var(--borda)' }}>
              Lente vendida por unidade entra com quantidade 2 (o par); vendida por par, quantidade 1.
            </div>
          </Card>

          <Card titulo="Observações">
            <textarea className="entrada" value={os.observacoes} onChange={e => upd({ observacoes: e.target.value })} />
          </Card>
        </div>

        <div style={{ position: 'sticky', top: 16 }}>
          <Card titulo="Resumo">
            <dl className="resumo">
              <dt>Subtotal</dt><dd>{formatarMoeda(subtotal(os.itens))}</dd>
              <dt>Desconto geral</dt><dd style={{ width: 120 }}><MoedaInput valor={os.descontoGeral} aoMudar={v => upd({ descontoGeral: v })} /></dd>
              <dt><b>Total</b></dt><dd className="grande">{formatarMoeda(total)}</dd>
              <dt>Recebido</dt><dd style={{ color: 'var(--ok)' }}>{formatarMoeda(pago)}</dd>
              <dt>Saldo</dt><dd>{formatarMoeda(saldo)}</dd>
            </dl>
            {os.pagamentos.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {os.pagamentos.map(p => <div key={p.id} className="linha fraco"><span>{FORMAS[p.forma]} · {formatarData(p.em)}</span><span className="espaco" /><span>{formatarMoeda(p.valor)}</span></div>)}
              </div>
            )}
            {parcelasOs.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="fraco" style={{ fontWeight: 700, marginBottom: 4 }}>Crediário</div>
                {parcelasOs.map(p => <div key={p.id} className="linha fraco"><span>{p.numero}ª · {formatarData(p.vencimento)}</span><span className="espaco" /><span>{formatarMoeda(p.valorCentavos)}</span></div>)}
              </div>
            )}
            <div className="linha" style={{ marginTop: 16 }}>
              <Botao disabled={saldo === 0 || os.status === 'orcamento'} onClick={() => setModal('entrada')}>Registrar entrada</Botao>
              <Botao variante="acento" disabled={os.status === 'finalizada' || os.status === 'cancelada'} onClick={() => setModal('finalizar')}>Finalizar</Botao>
            </div>
            {os.status === 'orcamento' && <p className="fraco" style={{ marginBottom: 0 }}>Orçamento não gera lançamento financeiro.</p>}
          </Card>
        </div>
      </div>

      <div className="rodape-fixo">
        <div><div className="fraco">Total da OS</div><div className="total">{formatarMoeda(total)}</div></div>
        <span className="espaco" />
        <Botao onClick={aoVoltar}>Cancelar</Botao>
        <Botao variante="primario" disabled={salvando} onClick={() => salvar()}>{salvando ? 'Salvando…' : 'Salvar OS'}</Botao>
      </div>

      {modal === 'cliente' && <ModalCliente aoFechar={() => setModal(null)} aoSalvar={id => { upd({ clienteId: id }); setModal(null) }} />}
      {modal === 'entrada' && (
        <ModalEntrada saldo={saldo} aoFechar={() => setModal(null)} aoConfirmar={async (forma, valor) => {
          const n = { ...os, pagamentos: [...os.pagamentos, { id: novoId(), forma, valor, em: hojeISO(), novo: true }] }
          setModal(null)
          await salvar(n)
        }} />
      )}
      {modal === 'finalizar' && (
        <ModalFinalizar os={os} saldo={saldo} aoFechar={() => setModal(null)} aoConfirmar={async (forma, cred) => {
          const n: OrdemServico = {
            ...os, status: 'finalizada',
            pagamentos: forma !== 'crediario_loja' && saldo > 0 ? [...os.pagamentos, { id: novoId(), forma, valor: saldo, em: hojeISO(), novo: true }] : os.pagamentos,
          }
          setModal(null)
          const salva = await salvar(n)
          if (salva && cred) {
            const ok = await tentar(() => gerarParcelas(salva, { valorCentavos: saldo, jurosMesPct: cred.juros, metodo: cred.metodo, lista: cred.sim.parcelas }))
            if (ok !== null) setOs(o => ({ ...o, crediario: { jurosMesPct: cred.juros, totalCentavos: cred.sim.totalCentavos } }))
            else setMsg('A OS foi salva, mas o crediário não foi gerado. Veja o erro no topo da tela.')
          }
        }} />
      )}
    </div>
  )
}

function MoedaInput({ valor, aoMudar }: { valor: number; aoMudar: (c: number) => void }) {
  const [txt, setTxt] = useState<string | null>(null)
  return (
    <Entrada className="num" inputMode="decimal"
      value={txt ?? (valor / 100).toFixed(2).replace('.', ',')}
      onFocus={e => { setTxt((valor / 100).toFixed(2).replace('.', ',')); e.target.select() }}
      onChange={e => setTxt(e.target.value)}
      onBlur={() => { aoMudar(paraCentavos(txt ?? '')); setTxt(null) }} />
  )
}

function ModalCliente({ aoFechar, aoSalvar }: { aoFechar: () => void; aoSalvar: (id: string) => void }) {
  const [c, setC] = useState({ nome: '', cpf: '', celular: '' })
  return (
    <Modal titulo="Novo cliente" aoFechar={aoFechar} rodape={<>
      <Botao onClick={aoFechar}>Cancelar</Botao>
      <Botao variante="primario" disabled={!c.nome.trim()} onClick={async () => {
        const novo = await tentar(() => salvarCliente(c))
        if (novo) aoSalvar(novo.id)
      }}>Salvar e usar na OS</Botao>
    </>}>
      <div className="grade">
        <Campo rotulo="Nome *" style={{ gridColumn: '1 / -1' }}><Entrada autoFocus value={c.nome} onChange={e => setC({ ...c, nome: e.target.value })} /></Campo>
        <Campo rotulo="CPF"><Entrada value={c.cpf} onChange={e => setC({ ...c, cpf: e.target.value })} /></Campo>
        <Campo rotulo="Celular (WhatsApp)"><Entrada value={c.celular} onChange={e => setC({ ...c, celular: e.target.value })} /></Campo>
      </div>
      <p className="fraco">Cadastro rápido. Endereço e dados fiscais podem ser completados depois em Clientes.</p>
    </Modal>
  )
}

function ModalEntrada({ saldo, aoFechar, aoConfirmar }: { saldo: number; aoFechar: () => void; aoConfirmar: (f: FormaPagamento, v: number) => void }) {
  const [forma, setForma] = useState<FormaPagamento>('dinheiro')
  const [valor, setValor] = useState(0)
  const invalido = valor <= 0 || valor > saldo
  return (
    <Modal titulo="Registrar entrada" aoFechar={aoFechar} rodape={<>
      <Botao onClick={aoFechar}>Cancelar</Botao>
      <Botao variante="primario" disabled={invalido} onClick={() => aoConfirmar(forma, valor)}>Lançar no caixa</Botao>
    </>}>
      <div className="grade">
        <Campo rotulo="Forma de pagamento">
          <Selecao value={forma} onChange={e => setForma(e.target.value as FormaPagamento)}>
            {(Object.keys(FORMAS) as FormaPagamento[]).filter(f => f !== 'crediario_loja').map(f => <option key={f} value={f}>{FORMAS[f]}</option>)}
          </Selecao>
        </Campo>
        <Campo rotulo={`Valor (saldo ${formatarMoeda(saldo)})`} erro={valor > saldo ? 'Maior que o saldo' : undefined}>
          <MoedaInput valor={valor} aoMudar={setValor} />
        </Campo>
      </div>
    </Modal>
  )
}

function ModalFinalizar({ os, saldo, aoFechar, aoConfirmar }: {
  os: OrdemServico; saldo: number; aoFechar: () => void
  aoConfirmar: (f: FormaPagamento, cred: { juros: number; metodo: MetodoJuros; sim: ReturnType<typeof simularCrediario> } | null) => void
}) {
  const [forma, setForma] = useState<FormaPagamento>(saldo > 0 ? 'crediario_loja' : 'dinheiro')
  const [n, setN] = useState(3)
  const [juros, setJuros] = useState(0)
  const [metodo, setMetodo] = useState<MetodoJuros>('price')
  const [primeiro, setPrimeiro] = useState(somarDias(hojeISO(), 30))
  const sim = useMemo(
    () => simularCrediario({ valorCentavos: saldo, parcelas: n, jurosMesPct: juros, metodo, primeiroVencimento: primeiro }),
    [saldo, n, juros, metodo, primeiro],
  )
  const ehCred = forma === 'crediario_loja' && saldo > 0
  return (
    <Modal titulo={`Finalizar OS nº ${os.numero || '(nova)'}`} aoFechar={aoFechar} rodape={<>
      <Botao onClick={aoFechar}>Cancelar</Botao>
      <Botao variante="primario" disabled={!os.clienteId} onClick={() => aoConfirmar(forma, ehCred ? { juros, metodo, sim } : null)}>
        {ehCred ? `Gerar ${n} parcelas e finalizar` : 'Finalizar OS'}
      </Botao>
    </>}>
      <dl className="resumo" style={{ marginBottom: 16 }}>
        <dt>Valor a faturar</dt><dd className="grande">{formatarMoeda(saldo)}</dd>
      </dl>
      {saldo > 0 && (
        <Campo rotulo="Forma de pagamento do saldo">
          <Selecao value={forma} onChange={e => setForma(e.target.value as FormaPagamento)}>
            {(Object.keys(FORMAS) as FormaPagamento[]).map(f => <option key={f} value={f}>{FORMAS[f]}</option>)}
          </Selecao>
        </Campo>
      )}
      {ehCred && (
        <>
          <div className="grade" style={{ marginTop: 12 }}>
            <Campo rotulo="Parcelas"><Entrada type="number" min={1} max={24} value={n} onChange={e => setN(Number(e.target.value))} /></Campo>
            <Campo rotulo="Juros ao mês (%)"><Entrada type="number" step={0.1} min={0} value={juros} onChange={e => setJuros(Number(e.target.value))} /></Campo>
            <Campo rotulo="Cálculo">
              <Selecao value={metodo} onChange={e => setMetodo(e.target.value as MetodoJuros)}>
                <option value="price">Parcelas iguais (Price)</option>
                <option value="simples">Juros simples</option>
              </Selecao>
            </Campo>
            <Campo rotulo="1º vencimento"><Entrada type="date" value={primeiro} onChange={e => setPrimeiro(e.target.value)} /></Campo>
          </div>
          <div className="card" style={{ marginTop: 16, marginBottom: 0 }}>
            <div className="card-corpo">
              <dl className="resumo">
                <dt>Valor financiado</dt><dd>{formatarMoeda(saldo)}</dd>
                <dt>Juros</dt><dd>{formatarMoeda(sim.jurosCentavos)}</dd>
                <dt>Total a pagar</dt><dd>{formatarMoeda(sim.totalCentavos)}</dd>
                <dt><b>{n}x de</b></dt><dd className="grande">{formatarMoeda(sim.parcelaCentavos)}</dd>
              </dl>
              <div style={{ marginTop: 10 }}>
                {sim.parcelas.map(p => <div key={p.numero} className="linha fraco"><span>{p.numero}ª parcela · {formatarData(p.vencimento)}</span><span className="espaco" /><span>{formatarMoeda(p.valorCentavos)}</span></div>)}
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
