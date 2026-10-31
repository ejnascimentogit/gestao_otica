// Catálogo da loja: link para mandar aos clientes, produtos que aparecem nele e
// a lista de quem deixou contato. O WhatsApp abre pelo link wa.me no aparelho de
// quem clica (sem API, sem envio automático).
import { useState } from 'react'
import { Badge, Botao, Card, Campo, Entrada, Modal, PageHeader, Selecao } from '../../components/ui'
import { FotoProduto, MiniaturaProduto } from '../../components/FotoProduto'
import { formatarMoeda } from '../../domain/formatos'
import {
  STATUS_INTERESSADO, formatarWhatsapp, gerarSlug, linkWhatsapp, mensagemConvite, mensagemRetorno, normalizarWhatsapp,
  urlCatalogo, validarConfigCatalogo, type StatusInteressado,
} from '../../domain/catalogo'
import {
  interessadoVirarCliente, mudarStatusInteressado, podeGerenciarUsuarios, salvarCatalogo, salvarProduto, tentar, useStore,
  type Catalogo, type Produto,
} from '../../data/store'
import { MODO_DEMO } from '../../lib/supabase'

const origem = () => (/^https?:$/.test(window.location.protocol) ? window.location.origin : 'https://gestao-otica.ejnascimento1.workers.dev')

function quando(iso: string): string {
  const d = new Date(iso), min = Math.round((Date.now() - d.getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  if (min < 24 * 60) return `há ${Math.round(min / 60)} h`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function CatalogoPage() {
  const { catalogoDisponivel, catalogo, papel, loja } = useStore()
  const gestor = podeGerenciarUsuarios(papel)
  const [config, setConfig] = useState(false)

  if (!catalogoDisponivel) {
    return (
      <div>
        <PageHeader titulo="Catálogo" sub="Link com as armações da loja para mandar aos clientes pelo WhatsApp." />
        <div className="aviso alerta">Falta aplicar no banco a atualização do catálogo (migração 5). Depois de rodar o SQL, recarregue a página.</div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader titulo="Catálogo" sub="Link com as armações da loja para mandar aos clientes pelo WhatsApp."
        acoes={gestor ? <Botao variante={catalogo ? undefined : 'primario'} onClick={() => setConfig(true)}>{catalogo ? 'Configurar' : 'Criar catálogo'}</Botao> : undefined} />

      {!catalogo ? (
        <Card>
          <p style={{ marginTop: 0 }}><b>A loja ainda não tem catálogo.</b></p>
          <p className="muted" style={{ marginBottom: 0 }}>
            {gestor
              ? 'Crie o catálogo, informe o WhatsApp da loja e marque quais produtos aparecem nele. Depois é só mandar o link para os clientes.'
              : 'Peça ao administrador ou gerente para criar o catálogo da loja.'}
          </p>
        </Card>
      ) : (
        <LinkCatalogo catalogo={catalogo} loja={loja.nome} />
      )}

      <ProdutosNoCatalogo />
      <Interessados />

      {config && <ModalConfig inicial={catalogo} nomeLoja={loja.nome} aoFechar={() => setConfig(false)} />}
    </div>
  )
}

function LinkCatalogo({ catalogo, loja }: { catalogo: Catalogo; loja: string }) {
  const { clientes, produtos } = useStore()
  const [copiado, setCopiado] = useState(false)
  const [clienteId, setClienteId] = useState('')
  const [numero, setNumero] = useState('')
  const link = urlCatalogo(origem(), catalogo.slug)
  const noCatalogo = produtos.filter(p => p.ativo && p.noCatalogo).length
  const cliente = clientes.find(c => c.id === clienteId)
  const numeroValido = !numero.trim() || !!normalizarWhatsapp(numero)

  async function copiar() {
    try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch { /* sem permissão */ }
  }
  const abrir = () => {
    if (MODO_DEMO) window.location.hash = 'catalogo-publico'
    else window.open(link, '_blank', 'noopener')
  }

  return (
    <Card titulo="Link do catálogo" acoes={catalogo.ativo ? <Badge tom="ok">Ligado</Badge> : <Badge tom="neutro">Desligado</Badge>}>
      <div style={{ display: 'grid', gap: 14 }}>
        {!catalogo.ativo && <div className="aviso alerta">O catálogo está desligado: quem abrir o link vê "catálogo indisponível". Ligue em Configurar.</div>}
        <div className="link-catalogo"><span style={{ flex: 1 }}>{link}</span></div>
        <div className="linha">
          <Botao onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar link'}</Botao>
          <Botao onClick={abrir}>Ver como o cliente vê</Botao>
          <span className="fraco">{noCatalogo} produto(s) no catálogo · WhatsApp da loja: {catalogo.whatsapp ? formatarWhatsapp(catalogo.whatsapp) : 'não informado'}</span>
        </div>

        <div style={{ borderTop: '1px solid var(--borda)', paddingTop: 14, display: 'grid', gap: 10 }}>
          <b>Mandar para um cliente</b>
          <div className="grade">
            <Campo rotulo="Cliente (opcional)">
              <Selecao value={clienteId} onChange={e => {
                setClienteId(e.target.value)
                const c = clientes.find(x => x.id === e.target.value)
                setNumero(c?.celular ?? '')
              }}>
                <option value="">Escolher no WhatsApp</option>
                {clientes.filter(c => c.celular).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Selecao>
            </Campo>
            <Campo rotulo="WhatsApp" erro={numeroValido ? undefined : 'Número com DDD'}>
              <Entrada type="tel" inputMode="tel" placeholder="Vazio: escolhe o contato no WhatsApp" invalida={!numeroValido}
                value={numero} onChange={e => { setNumero(e.target.value); setClienteId('') }} />
            </Campo>
          </div>
          <div className="linha">
            <a className={`botao whats ${!numeroValido || !catalogo.ativo ? 'desligado' : ''}`} target="_blank" rel="noopener"
              aria-disabled={!numeroValido || !catalogo.ativo}
              href={numeroValido && catalogo.ativo ? linkWhatsapp(numero || null, mensagemConvite(loja, link, cliente?.nome)) : undefined}>
              Abrir no WhatsApp
            </a>
            <span className="fraco">Abre o seu WhatsApp com a mensagem e o link prontos. Quem envia é você.</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

function ProdutosNoCatalogo() {
  const { produtos } = useStore()
  const [soArmacoes, setSoArmacoes] = useState(true)
  const [foto, setFoto] = useState<Produto | null>(null)
  const lista = produtos.filter(p => p.ativo && (soArmacoes ? p.tipo === 'armacao' : true))
  const marcados = produtos.filter(p => p.ativo && p.noCatalogo)

  const alternar = (p: Produto) => tentar(() => salvarProduto({ ...p, noCatalogo: !p.noCatalogo }))

  return (
    <Card titulo={<>Produtos no catálogo <small>{marcados.length} marcado(s)</small></>} sem_padding acoes={
      <div className="chips">
        <button type="button" className={`chip ${soArmacoes ? 'ativo' : ''}`} onClick={() => setSoArmacoes(true)}>Armações</button>
        <button type="button" className={`chip ${!soArmacoes ? 'ativo' : ''}`} onClick={() => setSoArmacoes(false)}>Todos</button>
      </div>
    }>
      {lista.length === 0 ? <div className="vazio">Nenhum produto ativo{soArmacoes ? ' do tipo armação' : ''}. Cadastre em Produtos e serviços.</div> : (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead><tr><th style={{ width: 60 }}>Foto</th><th>Produto</th><th className="num">Preço</th><th style={{ width: 80 }}>Mostrar</th></tr></thead>
            <tbody>
              {lista.map(p => (
                <tr key={p.id}>
                  <td>
                    <button type="button" className="sem-estilo" title={p.fotoUrl ? 'Trocar foto' : 'Adicionar foto'} onClick={() => setFoto(p)}>
                      <MiniaturaProduto url={p.fotoUrl} alt={p.descricao} />
                    </button>
                  </td>
                  <td>
                    <b>{p.descricao}</b>
                    <div className="fraco">{p.fotoUrl ? (p.marca && p.marca !== '—' ? p.marca : '') : <button type="button" className="link" onClick={() => setFoto(p)}>Adicionar foto</button>}</div>
                  </td>
                  <td className="num"><b>{formatarMoeda(p.preco)}</b></td>
                  <td>
                    <input type="checkbox" className="ap-chave" aria-label={`Mostrar ${p.descricao} no catálogo`} checked={!!p.noCatalogo} onChange={() => alternar(p)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {foto && <ModalFoto produto={foto} aoFechar={() => setFoto(null)} />}
    </Card>
  )
}

function ModalFoto({ produto, aoFechar }: { produto: Produto; aoFechar: () => void }) {
  const { produtos } = useStore()
  const atual = produtos.find(p => p.id === produto.id) ?? produto
  return (
    <Modal titulo={`Foto: ${atual.descricao}`} aoFechar={aoFechar} rodape={<Botao variante="primario" onClick={aoFechar}>Pronto</Botao>}>
      <FotoProduto produtoId={atual.id} url={atual.fotoUrl}
        aoMudar={url => tentar(() => salvarProduto({ ...atual, fotoUrl: url }))} />
    </Modal>
  )
}

function Interessados() {
  const { interessados, catalogo, loja } = useStore()
  const [filtro, setFiltro] = useState<StatusInteressado | 'abertos'>('abertos')
  const [aviso, setAviso] = useState('')
  const contar = (s: StatusInteressado) => interessados.filter(i => i.status === s).length
  const lista = interessados.filter(i => filtro === 'abertos' ? i.status === 'novo' || i.status === 'em_contato' : i.status === filtro)

  async function virarCliente(id: string) {
    const c = await tentar(() => interessadoVirarCliente(id))
    if (c) setAviso(`${c.nome} está em Clientes.`)
  }

  return (
    <Card titulo={<>Interessados <small>pessoas que deixaram contato no catálogo</small></>} sem_padding>
      <div className="card-corpo" style={{ paddingBottom: 8 }}>
        <div className="chips">
          <button type="button" className={`chip ${filtro === 'abertos' ? 'ativo' : ''}`} onClick={() => setFiltro('abertos')}>Em aberto ({contar('novo') + contar('em_contato')})</button>
          {(Object.keys(STATUS_INTERESSADO) as StatusInteressado[]).map(s => (
            <button key={s} type="button" className={`chip ${filtro === s ? 'ativo' : ''}`} onClick={() => setFiltro(s)}>{STATUS_INTERESSADO[s].rotulo} ({contar(s)})</button>
          ))}
        </div>
        {aviso && <div className="aviso ok" style={{ marginTop: 10 }}><span style={{ flex: 1 }}>{aviso}</span><Botao pequeno variante="fantasma" onClick={() => setAviso('')}>Fechar</Botao></div>}
      </div>
      {lista.length === 0 ? (
        <div className="vazio">{interessados.length ? 'Ninguém nesta situação.' : catalogo ? 'Quando alguém tocar em "Tenho interesse" no catálogo, aparece aqui.' : 'Crie o catálogo para começar a receber contatos.'}</div>
      ) : lista.map(i => {
        const st = STATUS_INTERESSADO[i.status]
        return (
          <div key={i.id} className="interessado">
            <div style={{ minWidth: 0 }}>
              <b>{i.nome}</b> <span className="muted">{formatarWhatsapp(i.whatsapp)}</span>
              <div className="fraco">{i.produtoDescricao ? `Interesse: ${i.produtoDescricao}` : 'Pediu contato pelo catálogo'} · {quando(i.criadoEm)}</div>
            </div>
            <div><Badge tom={st.tom}>{st.rotulo}</Badge></div>
            <div className="acoes">
              <a className="botao pequeno whats" target="_blank" rel="noopener"
                href={linkWhatsapp(i.whatsapp, mensagemRetorno({ loja: loja.nome, nomeCliente: i.nome, produto: i.produtoDescricao }))}
                onClick={() => { if (i.status === 'novo') tentar(() => mudarStatusInteressado(i.id, 'em_contato')) }}>
                Chamar no WhatsApp
              </a>
              {i.status !== 'virou_cliente' && <Botao pequeno onClick={() => virarCliente(i.id)}>Virar cliente</Botao>}
              {i.status === 'descartado'
                ? <Botao pequeno variante="fantasma" onClick={() => tentar(() => mudarStatusInteressado(i.id, 'novo'))}>Reabrir</Botao>
                : i.status !== 'virou_cliente' && <Botao pequeno variante="fantasma" onClick={() => tentar(() => mudarStatusInteressado(i.id, 'descartado'))}>Descartar</Botao>}
            </div>
          </div>
        )
      })}
    </Card>
  )
}

function ModalConfig({ inicial, nomeLoja, aoFechar }: { inicial: Catalogo | null; nomeLoja: string; aoFechar: () => void }) {
  const [c, setC] = useState<Catalogo>(() => inicial
    ? { ...inicial, whatsapp: inicial.whatsapp ? formatarWhatsapp(inicial.whatsapp) : '' }
    : { slug: gerarSlug(nomeLoja), ativo: true, whatsapp: '', titulo: 'Nossas armações', apresentacao: '' })
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const erros = validarConfigCatalogo(c)
  const mostrar = (k: string) => (tentou ? erros[k] : undefined)
  const upd = (p: Partial<Catalogo>) => setC(x => ({ ...x, ...p }))

  async function salvar() {
    setTentou(true)
    if (Object.keys(erros).length) return
    setSalvando(true)
    const ok = await tentar(() => salvarCatalogo({ ...c, whatsapp: normalizarWhatsapp(c.whatsapp) ?? '' }))
    setSalvando(false)
    if (ok !== null) aoFechar()
  }

  return (
    <Modal titulo={inicial ? 'Configurar catálogo' : 'Criar catálogo'} aoFechar={aoFechar} rodape={<>
      <Botao onClick={aoFechar}>Cancelar</Botao>
      <Botao variante="primario" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar'}</Botao>
    </>}>
      <div style={{ display: 'grid', gap: 14 }}>
        <Campo rotulo="Endereço do catálogo" erro={mostrar('slug')}>
          <Entrada invalida={!!mostrar('slug')} value={c.slug} maxLength={40} onChange={e => upd({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
        </Campo>
        <div className="fraco" style={{ marginTop: -8 }}>{urlCatalogo(origem(), c.slug || '…')}{inicial && inicial.slug !== c.slug ? ' · o link antigo deixa de funcionar' : ''}</div>
        <Campo rotulo="WhatsApp da loja (recebe as mensagens)" erro={mostrar('whatsapp')}>
          <Entrada type="tel" inputMode="tel" placeholder="(81) 99876-5432" invalida={!!mostrar('whatsapp')} value={c.whatsapp} onChange={e => upd({ whatsapp: e.target.value })} />
        </Campo>
        <Campo rotulo="Título">
          <Entrada value={c.titulo} maxLength={80} placeholder="Nossas armações" onChange={e => upd({ titulo: e.target.value })} />
        </Campo>
        <Campo rotulo="Recado para o cliente (opcional)">
          <textarea className="entrada" rows={3} maxLength={400} value={c.apresentacao} placeholder="Ex.: Atendemos de segunda a sábado. Parcelamos no crediário."
            onChange={e => upd({ apresentacao: e.target.value })} />
        </Campo>
        <label className="chave-linha">
          <input type="checkbox" className="ap-chave" checked={c.ativo} onChange={e => upd({ ativo: e.target.checked })} />
          <span><b>Catálogo ligado</b><span className="fraco" style={{ display: 'block' }}>Desligado, o link mostra "catálogo indisponível".</span></span>
        </label>
      </div>
    </Modal>
  )
}
