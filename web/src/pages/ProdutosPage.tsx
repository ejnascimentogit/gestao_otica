import { useState } from 'react'
import { Badge, Botao, Card, Campo, Entrada, Icone, Modal, PageHeader, Selecao } from '../components/ui'
import { formatarMoeda, paraCentavos } from '../domain/formatos'
import { DESENHOS_LENTE, INDICES_REFRACAO, TIPOS_PRODUTO, margemPct, validarProduto } from '../domain/produtos'
import type { TipoProduto } from '../domain/totais'
import { novoId, salvarProduto, tentar, useStore, type Produto } from '../data/store'

const novoProduto = (): Produto => ({
  id: novoId(), tipo: 'lente', descricao: '', marca: '', unidade: 'UN', preco: 0, custo: 0, estoque: 0, ativo: true,
  codigo: '', indice: undefined, desenho: 'monofocal',
})

export function ProdutosPage() {
  const { produtos } = useStore()
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState<TipoProduto | 'todos'>('todos')
  const [verInativos, setVerInativos] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)

  const lista = produtos
    .filter(p => verInativos || p.ativo)
    .filter(p => tipo === 'todos' || p.tipo === tipo)
    .filter(p => (p.descricao + ' ' + p.marca + ' ' + (p.codigo ?? '')).toLowerCase().includes(busca.toLowerCase()))

  const ativos = produtos.filter(p => p.ativo).length

  return (
    <div>
      <PageHeader titulo="Produtos e serviços" sub={`${ativos} ativos · ${produtos.length - ativos} inativos`}
        acoes={<Botao variante="primario" onClick={() => setEditando(novoProduto())}>{Icone.mais} Novo produto</Botao>} />

      <div className="linha" style={{ marginBottom: 12 }}>
        <div style={{ flex: '1 1 240px', maxWidth: 340 }}>
          <Entrada placeholder="Buscar por descrição, marca ou código" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <div className="chips">
          <button className={`chip ${tipo === 'todos' ? 'ativo' : ''}`} onClick={() => setTipo('todos')}>Todos</button>
          {(Object.keys(TIPOS_PRODUTO) as TipoProduto[]).map(t => (
            <button key={t} className={`chip ${tipo === t ? 'ativo' : ''}`} onClick={() => setTipo(t)}>{TIPOS_PRODUTO[t]}</button>
          ))}
        </div>
        <label className="linha fraco" style={{ gap: 6 }}>
          <input type="checkbox" checked={verInativos} onChange={e => setVerInativos(e.target.checked)} /> Mostrar inativos
        </label>
      </div>

      <Card sem_padding>
        {lista.length === 0 ? <div className="vazio">Nenhum produto encontrado.</div> : (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>Descrição</th><th>Tipo</th><th className="col-sec">Unidade</th><th className="num col-sec">Custo</th><th className="num">Preço</th><th className="num col-sec">Margem</th><th className="num">Estoque</th><th>Situação</th></tr></thead>
              <tbody>
                {lista.map(p => {
                  const m = margemPct(p.preco, p.custo)
                  return (
                    <tr key={p.id} className="clicavel" onClick={() => setEditando({ ...p })}>
                      <td>
                        <b>{p.descricao}</b>
                        <div className="fraco">{[p.marca, p.codigo, p.indice ? `índice ${p.indice.toFixed(2)}` : '', p.desenho].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td>{TIPOS_PRODUTO[p.tipo]}</td>
                      <td className="col-sec">{p.unidade === 'PAR' ? 'Par' : 'Unidade'}</td>
                      <td className="num muted col-sec">{formatarMoeda(p.custo)}</td>
                      <td className="num"><b>{formatarMoeda(p.preco)}</b></td>
                      <td className="num col-sec" style={{ color: m !== null && m < 0 ? 'var(--erro)' : undefined }}>{m === null ? '—' : `${m.toFixed(1).replace('.', ',')}%`}</td>
                      <td className="num">{p.tipo === 'servico' ? '—' : p.estoque}</td>
                      <td>{p.ativo ? <Badge tom="ok">Ativo</Badge> : <Badge tom="neutro">Inativo</Badge>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editando && <ModalProduto inicial={editando} aoFechar={() => setEditando(null)} />}
    </div>
  )
}

function DinheiroInput({ id, valor, aoMudar, invalida }: { id: string; valor: number; aoMudar: (c: number) => void; invalida?: boolean }) {
  const [txt, setTxt] = useState<string | null>(null)
  return (
    <Entrada id={id} className="num" inputMode="decimal" invalida={invalida}
      value={txt ?? (valor / 100).toFixed(2).replace('.', ',')}
      onFocus={e => { setTxt((valor / 100).toFixed(2).replace('.', ',')); e.target.select() }}
      onChange={e => setTxt(e.target.value)}
      onBlur={() => { aoMudar(paraCentavos(txt ?? '')); setTxt(null) }} />
  )
}

function ModalProduto({ inicial, aoFechar }: { inicial: Produto; aoFechar: () => void }) {
  const { produtos } = useStore()
  const [p, setP] = useState<Produto>(inicial)
  const [tentouSalvar, setTentouSalvar] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const existente = produtos.some(x => x.id === p.id)
  const erros = validarProduto(p)
  const mostrar = (k: string) => (tentouSalvar ? erros[k] : undefined)
  const m = margemPct(p.preco, p.custo)
  const upd = (patch: Partial<Produto>) => setP(x => ({ ...x, ...patch }))

  async function salvar() {
    setTentouSalvar(true)
    if (Object.keys(erros).length) return
    setSalvando(true)
    const ok = await tentar(() => salvarProduto(p))
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Modal titulo={existente ? 'Editar produto' : 'Novo produto'} aoFechar={aoFechar} rodape={<>
      {existente && (
        <Botao variante="fantasma" style={{ marginRight: 'auto' }} onClick={() => upd({ ativo: !p.ativo })}>
          {p.ativo ? 'Desativar' : 'Reativar'}
        </Botao>
      )}
      <Botao onClick={aoFechar}>Cancelar</Botao>
      <Botao variante="primario" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar'}</Botao>
    </>}>
      {!p.ativo && <div className="aviso alerta" style={{ marginBottom: 12 }}>Produto inativo: não aparece na busca da OS. As OS antigas continuam com ele.</div>}
      <div className="grade">
        <Campo rotulo="Tipo">
          <Selecao id="prod-tipo" value={p.tipo} onChange={e => upd({ tipo: e.target.value as TipoProduto })}>
            {(Object.keys(TIPOS_PRODUTO) as TipoProduto[]).map(t => <option key={t} value={t}>{TIPOS_PRODUTO[t]}</option>)}
          </Selecao>
        </Campo>
        <Campo rotulo="Vendido por">
          <Selecao id="prod-unidade" value={p.unidade} onChange={e => upd({ unidade: e.target.value as Produto['unidade'] })}>
            <option value="UN">Unidade</option>
            <option value="PAR">Par</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Descrição *" erro={mostrar('descricao')} style={{ gridColumn: '1 / -1' }}>
          <Entrada id="prod-descricao" autoFocus invalida={!!mostrar('descricao')} value={p.descricao} placeholder="Ex.: Lente monofocal 1.67 filtro azul" onChange={e => upd({ descricao: e.target.value })} />
        </Campo>
        <Campo rotulo="Marca"><Entrada id="prod-marca" value={p.marca} onChange={e => upd({ marca: e.target.value })} /></Campo>
        <Campo rotulo="Código"><Entrada id="prod-codigo" value={p.codigo ?? ''} placeholder="Opcional" onChange={e => upd({ codigo: e.target.value })} /></Campo>
        <Campo rotulo="Custo (R$)" erro={mostrar('custo')}><DinheiroInput id="prod-custo" valor={p.custo} aoMudar={v => upd({ custo: v })} invalida={!!mostrar('custo')} /></Campo>
        <Campo rotulo="Preço de venda (R$) *" erro={mostrar('preco')}><DinheiroInput id="prod-preco" valor={p.preco} aoMudar={v => upd({ preco: v })} invalida={!!mostrar('preco')} /></Campo>
        {p.tipo !== 'servico' && (
          <Campo rotulo="Estoque" erro={mostrar('estoque')}>
            <Entrada id="prod-estoque" type="number" className="num" value={p.estoque} onChange={e => upd({ estoque: Number(e.target.value) })} />
          </Campo>
        )}
        {p.tipo === 'lente' && (
          <>
            <Campo rotulo="Índice de refração" erro={mostrar('indice')}>
              <Selecao id="prod-indice" value={p.indice ?? ''} onChange={e => upd({ indice: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">Não informado</option>
                {INDICES_REFRACAO.map(i => <option key={i} value={i}>{i.toFixed(2)}</option>)}
              </Selecao>
            </Campo>
            <Campo rotulo="Desenho">
              <Selecao id="prod-desenho" value={p.desenho ?? ''} onChange={e => upd({ desenho: e.target.value })}>
                {DESENHOS_LENTE.map(d => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}
              </Selecao>
            </Campo>
          </>
        )}
      </div>
      <p className="fraco" style={{ marginBottom: 0 }}>
        Margem: <b>{m === null ? '—' : `${m.toFixed(1).replace('.', ',')}%`}</b>
        {p.tipo === 'lente' && p.unidade === 'UN' && ' · Lente por unidade entra na OS com quantidade 2 (o par).'}
      </p>
    </Modal>
  )
}
