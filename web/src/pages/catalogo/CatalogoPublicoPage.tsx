// O que o cliente da loja vê ao abrir o link do catálogo. Sem login.
// "Tenho interesse": pede nome e WhatsApp (com autorização), registra na lista de
// interessados da loja e abre o WhatsApp com a mensagem pronta para a loja.
import { useEffect, useState } from 'react'
import { Botao, Campo, Entrada, Modal } from '../../components/ui'
import { SemFoto } from '../../components/FotoProduto'
import { formatarMoeda } from '../../domain/formatos'
import { linkWhatsapp, mensagemInteresse, validarInteresse } from '../../domain/catalogo'
import { abrirCatalogoPublico, registrarInteressePublico, type CatalogoPublico, type ProdutoPublico } from '../../data/store'

const CHAVE_CONTATO = 'go_catalogo_contato'
const lerContato = (): { nome: string; whatsapp: string } => {
  try { return JSON.parse(localStorage.getItem(CHAVE_CONTATO) || 'null') ?? { nome: '', whatsapp: '' } } catch { return { nome: '', whatsapp: '' } }
}

const IconeWhats = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1L4 20Z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2L9 9.5Z" />
  </svg>
)

export function CatalogoPublicoPage({ slug, aoVoltar }: { slug: string; aoVoltar?: () => void }) {
  const [cat, setCat] = useState<CatalogoPublico | null | undefined>(undefined)
  const [erro, setErro] = useState('')
  const [escolhido, setEscolhido] = useState<ProdutoPublico | null | 'geral'>(null)

  useEffect(() => {
    abrirCatalogoPublico(slug)
      .then(c => { setCat(c); if (c) document.title = `${c.titulo || 'Catálogo'} · ${c.loja.nome}` })
      .catch(e => { setErro(e instanceof Error ? e.message : String(e)); setCat(null) })
  }, [slug])

  if (cat === undefined) return <div className="vazio" style={{ paddingTop: 120 }}>Abrindo o catálogo…</div>
  if (!cat) {
    return (
      <div className="pub" style={{ display: 'grid', placeItems: 'center', padding: 16 }}>
        <div className="card" style={{ maxWidth: 420, width: '100%' }}>
          <div className="card-corpo" style={{ display: 'grid', gap: 10, textAlign: 'center' }}>
            <SemFoto tamanho={64} />
            <b>Catálogo indisponível</b>
            <p className="muted" style={{ margin: 0 }}>{erro ? 'Não foi possível abrir agora. Tente de novo em instantes.' : 'Este catálogo não existe ou está desligado no momento.'}</p>
            {aoVoltar && <Botao onClick={aoVoltar}>Voltar ao sistema</Botao>}
          </div>
        </div>
      </div>
    )
  }

  const logo = cat.loja.logoIconeUrl || cat.loja.logoUrl
  return (
    <div className="pub">
      <header className="pub-topo">
        <div className="pub-topo-in">
          {logo && <img src={logo} alt="" width={52} height={52} style={{ borderRadius: '50%', flex: 'none' }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1>{cat.loja.nome}</h1>
            <div className="muted">{cat.titulo || 'Catálogo'}</div>
          </div>
          {aoVoltar && <Botao pequeno onClick={aoVoltar}>Voltar ao sistema</Botao>}
        </div>
      </header>

      <main className="pub-corpo">
        {cat.apresentacao && <p className="muted" style={{ marginTop: 0, maxWidth: 640 }}>{cat.apresentacao}</p>}
        {cat.produtos.length === 0 ? (
          <div className="vazio">Ainda não há produtos neste catálogo.</div>
        ) : (
          <div className="pub-grade">
            {cat.produtos.map(p => (
              <article key={p.id} className="pub-item">
                <div className="pub-foto">{p.fotoUrl ? <img src={p.fotoUrl} alt={p.descricao} loading="lazy" /> : <SemFoto tamanho={72} />}</div>
                <div className="pub-info">
                  <b>{p.descricao}</b>
                  {p.marca && p.marca !== '—' && <span className="fraco">{p.marca}</span>}
                  <span className="pub-preco">{formatarMoeda(p.preco)}</span>
                </div>
                <Botao variante="primario" disabled={!cat.whatsapp} onClick={() => setEscolhido(p)}>Tenho interesse</Botao>
              </article>
            ))}
          </div>
        )}
      </main>

      {cat.whatsapp && (
        <div className="pub-rodape">
          <Botao className="whats" onClick={() => setEscolhido('geral')}>{IconeWhats} Falar com a loja no WhatsApp</Botao>
        </div>
      )}

      {escolhido && (
        <ModalInteresse slug={slug} cat={cat} produto={escolhido === 'geral' ? null : escolhido} aoFechar={() => setEscolhido(null)} />
      )}
    </div>
  )
}

function ModalInteresse({ slug, cat, produto, aoFechar }: { slug: string; cat: CatalogoPublico; produto: ProdutoPublico | null; aoFechar: () => void }) {
  const salvo = lerContato()
  const [nome, setNome] = useState(salvo.nome)
  const [whatsapp, setWhatsapp] = useState(salvo.whatsapp)
  const [aceite, setAceite] = useState(false)
  const [tentou, setTentou] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const erros = validarInteresse(nome, whatsapp, aceite)
  const mostrar = (k: string) => (tentou ? erros[k] : undefined)

  async function continuar() {
    setTentou(true)
    if (Object.keys(erros).length) return
    setEnviando(true)
    try { localStorage.setItem(CHAVE_CONTATO, JSON.stringify({ nome: nome.trim(), whatsapp })) } catch { /* sem armazenamento */ }
    // Se o registro falhar (sem internet, etc.), o cliente ainda consegue falar com a loja
    try { await registrarInteressePublico(slug, produto, nome, whatsapp) } catch { /* segue para o WhatsApp */ }
    const texto = mensagemInteresse({ loja: cat.loja.nome, nomeCliente: nome, produto: produto?.descricao, preco: produto?.preco })
    window.location.href = linkWhatsapp(cat.whatsapp, texto)
    setEnviando(false)
  }

  return (
    <Modal titulo={produto ? 'Tenho interesse' : 'Falar com a loja'} aoFechar={aoFechar} rodape={<>
      <Botao onClick={aoFechar}>Voltar</Botao>
      <Botao className="whats" disabled={enviando} onClick={continuar}>{IconeWhats} {enviando ? 'Abrindo…' : 'Continuar no WhatsApp'}</Botao>
    </>}>
      <div style={{ display: 'grid', gap: 12 }}>
        {produto && (
          <div className="linha" style={{ flexWrap: 'nowrap' }}>
            <span className="foto-mini" style={{ width: 64, height: 48 }}>{produto.fotoUrl ? <img src={produto.fotoUrl} alt="" /> : <SemFoto tamanho={40} />}</span>
            <div><b>{produto.descricao}</b><div className="muted">{formatarMoeda(produto.preco)}</div></div>
          </div>
        )}
        <p className="muted" style={{ margin: 0 }}>Deixe seu nome e WhatsApp. Em seguida abrimos a conversa com a {cat.loja.nome} com a mensagem pronta.</p>
        <Campo rotulo="Seu nome" erro={mostrar('nome')}>
          <Entrada autoFocus autoComplete="name" invalida={!!mostrar('nome')} value={nome} maxLength={80} onChange={e => setNome(e.target.value)} />
        </Campo>
        <Campo rotulo="Seu WhatsApp (com DDD)" erro={mostrar('whatsapp')}>
          <Entrada type="tel" inputMode="tel" autoComplete="tel" placeholder="(81) 99876-5432" invalida={!!mostrar('whatsapp')} value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
        </Campo>
        <label className="chave-linha" style={{ alignItems: 'flex-start' }}>
          <input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)} style={{ marginTop: 3 }} />
          <span>Autorizo a {cat.loja.nome} a guardar meu nome e WhatsApp para falar comigo sobre este atendimento.</span>
        </label>
        {mostrar('aceite') && <span className="erro-msg" style={{ color: 'var(--erro)', fontSize: 12, fontWeight: 600 }}>{erros.aceite}</span>}
      </div>
    </Modal>
  )
}
