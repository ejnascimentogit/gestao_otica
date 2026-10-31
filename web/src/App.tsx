import { useEffect, useState, type ReactNode } from 'react'
import { Botao, Icone } from './components/ui'
import { DashboardPage } from './pages/DashboardPage'
import { OrdensPage } from './pages/ordens/OrdensPage'
import { ClientesPage } from './pages/ClientesPage'
import { FinanceiroPage } from './pages/FinanceiroPage'
import { AgendaPage } from './pages/AgendaPage'
import { SimuladorPage } from './pages/SimuladorPage'
import { LoginPage } from './pages/LoginPage'
import { ProdutosPage } from './pages/ProdutosPage'
import { LaboratoriosPage } from './pages/LaboratoriosPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { CatalogoPage } from './pages/catalogo/CatalogoPage'
import { CatalogoPublicoPage } from './pages/catalogo/CatalogoPublicoPage'
import { slugDoCaminho } from './domain/catalogo'
import { TrocarSenha } from './components/TrocarSenha'
import { Aparencia } from './components/Aparencia'
import { MODO_DEMO, sb } from './lib/supabase'
import { encerrar, iniciar, limparErro, podeGerenciarUsuarios, useStore } from './data/store'

// Registro de módulos: para adicionar uma tela, inclua aqui (ver .claude/skills/nova-tela)
const MODULOS: Array<{ rota: string; rotulo: string; icone: ReactNode; grupo?: string; soGestor?: boolean }> = [
  { rota: 'painel', rotulo: 'Painel', icone: Icone.painel },
  { rota: 'ordens', rotulo: 'Ordens de serviço', icone: Icone.os, grupo: 'Atendimento' },
  { rota: 'agenda', rotulo: 'Agenda', icone: Icone.agenda },
  { rota: 'simulador', rotulo: 'Simulador de lentes', icone: Icone.simulador },
  { rota: 'catalogo', rotulo: 'Catálogo', icone: Icone.catalogo },
  { rota: 'clientes', rotulo: 'Clientes', icone: Icone.clientes, grupo: 'Cadastros' },
  { rota: 'produtos', rotulo: 'Produtos e serviços', icone: Icone.produtos },
  { rota: 'laboratorios', rotulo: 'Laboratórios', icone: Icone.laboratorio },
  { rota: 'financeiro', rotulo: 'Financeiro', icone: Icone.financeiro, grupo: 'Gestão' },
  { rota: 'usuarios', rotulo: 'Usuários', icone: Icone.chave, soGestor: true },
]

const rotaAtual = () => window.location.hash.replace(/^#\/?/, '') || 'painel'

type Fase = 'verificando' | 'login' | 'sem_loja' | 'carregando' | 'pronto' | 'falha'

export default function App() {
  // Link público do catálogo (/catalogo/<endereço>): abre sem login
  const slugPublico = MODO_DEMO ? null : slugDoCaminho(window.location.pathname)
  if (slugPublico) return <CatalogoPublicoPage slug={slugPublico} />
  return <AppInterno />
}

function AppInterno() {
  const [fase, setFase] = useState<Fase>('verificando')

  useEffect(() => {
    if (MODO_DEMO) { iniciar().then(() => setFase('pronto')); return }

    let ativo = true
    async function abrir(temSessao: boolean) {
      if (!ativo) return
      if (!temSessao) { encerrar(); setFase('login'); return }
      setFase('carregando')
      try {
        const r = await iniciar()
        if (ativo) setFase(r === 'ok' ? 'pronto' : 'sem_loja')
      } catch {
        if (ativo) setFase('falha')
      }
    }
    sb.auth.getSession().then(({ data }) => abrir(!!data.session))
    const { data: sub } = sb.auth.onAuthStateChange((evento, sessao) => {
      if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT') abrir(!!sessao)
    })
    return () => { ativo = false; sub.subscription.unsubscribe() }
  }, [])

  const sair = () => sb.auth.signOut()

  if (fase === 'verificando' || fase === 'carregando') {
    return <div className="vazio" style={{ paddingTop: 120 }}>{fase === 'carregando' ? 'Carregando os dados da loja…' : 'Abrindo…'}</div>
  }
  if (fase === 'login') return <LoginPage />
  if (fase === 'sem_loja') {
    return (
      <div style={{ maxWidth: 420, margin: '120px auto', padding: 16 }} className="card">
        <div className="card-corpo" style={{ display: 'grid', gap: 12 }}>
          <b>Usuário sem loja</b>
          <p className="muted" style={{ margin: 0 }}>Este login ainda não está ligado a nenhuma loja. Peça ao administrador para cadastrar você.</p>
          <Botao onClick={sair}>Sair</Botao>
        </div>
      </div>
    )
  }
  if (fase === 'falha') return <Falha aoSair={sair} />
  return <Sistema aoSair={MODO_DEMO ? undefined : sair} />
}

function Falha({ aoSair }: { aoSair: () => void }) {
  const { erro } = useStore()
  return (
    <div style={{ maxWidth: 480, margin: '120px auto', padding: 16 }} className="card">
      <div className="card-corpo" style={{ display: 'grid', gap: 12 }}>
        <b>Não foi possível carregar os dados</b>
        <p className="muted" style={{ margin: 0 }}>{erro || 'Verifique a conexão e tente de novo.'}</p>
        <div className="linha">
          <Botao variante="primario" onClick={() => window.location.reload()}>Tentar de novo</Botao>
          <Botao onClick={aoSair}>Sair</Botao>
        </div>
      </div>
    </div>
  )
}

function Sistema({ aoSair }: { aoSair?: () => void }) {
  const { loja, usuario, erro, papel, trocarSenha, interessados, catalogo } = useStore()
  const [rota, setRota] = useState(rotaAtual)
  const [menuAberto, setMenuAberto] = useState(false)
  const [modalSenha, setModalSenha] = useState(false)
  const [modalAparencia, setModalAparencia] = useState(false)
  const modulos = MODULOS.filter(m => !m.soGestor || podeGerenciarUsuarios(papel))

  useEffect(() => {
    const f = () => { setRota(rotaAtual()); setMenuAberto(false) }
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])

  const irPara = (r: string) => { window.location.hash = r }

  const novosInteressados = interessados.filter(i => i.status === 'novo').length
  if (rota === 'catalogo-publico' && MODO_DEMO) {
    return <CatalogoPublicoPage slug={catalogo?.slug ?? ''} aoVoltar={() => irPara('catalogo')} />
  }

  const pagina = {
    painel: <DashboardPage irPara={irPara} />,
    ordens: <OrdensPage />,
    agenda: <AgendaPage />,
    simulador: <SimuladorPage />,
    clientes: <ClientesPage />,
    produtos: <ProdutosPage />,
    laboratorios: <LaboratoriosPage />,
    financeiro: <FinanceiroPage />,
    usuarios: <UsuariosPage />,
    catalogo: <CatalogoPage />,
  }[rota] ?? <DashboardPage irPara={irPara} />

  return (
    <div className="app">
      <header className="topo-mobile">
        <button className="botao fantasma pequeno" aria-label="Menu" onClick={() => setMenuAberto(true)}>{Icone.menu}</button>
        {loja.nome || 'Gestão Ótica'}
      </header>
      <nav className={`lateral ${menuAberto ? 'aberta' : ''}`} onClick={e => e.target === e.currentTarget && setMenuAberto(false)}>
        {loja.logoIconeUrl ? (
          <div className="logo">
            <img src={loja.logoIconeUrl} alt="" width={36} height={36} style={{ borderRadius: '50%', flex: 'none' }} />
            <span style={{ lineHeight: 1.15 }}>{loja.nome}<span className="fraco" style={{ display: 'block', fontWeight: 600 }}>{loja.codigo ? `Loja ${loja.codigo} · ` : ''}Gestão Ótica</span></span>
          </div>
        ) : (
          <div className="logo">
            <span className="logo-marca">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="13" r="4" /><circle cx="17" cy="13" r="4" /><path d="M11 13h2" /></svg>
            </span>
            Gestão Ótica
          </div>
        )}
        {modulos.map(m => (
          <div key={m.rota}>
            {m.grupo && <div className="menu-grupo">{m.grupo}</div>}
            <a href={`#${m.rota}`} className={`menu-item ${rota === m.rota ? 'ativo' : ''}`} onClick={() => setMenuAberto(false)}>
              {m.icone}<span style={{ flex: 1 }}>{m.rotulo}</span>
              {m.rota === 'catalogo' && novosInteressados > 0 && <span className="menu-contador" title="Interessados novos">{novosInteressados}</span>}
            </a>
          </div>
        ))}
        <div className="lateral-rodape">
          {aoSair ? (
            <div style={{ display: 'grid', gap: 6 }}>
              <div><b style={{ color: 'var(--lateral-forte)' }}>{loja.codigo ? `${loja.codigo} · ` : ''}{loja.nome}</b><div>{usuario}</div></div>
              <div className="linha" style={{ gap: 6 }}>
                <Botao pequeno onClick={() => setModalAparencia(true)}>Aparência</Botao>
                <Botao pequeno onClick={() => setModalSenha(true)}>Trocar senha</Botao>
                <Botao pequeno onClick={aoSair}>Sair</Botao>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              <span>Protótipo · dados de exemplo</span>
              <div><Botao pequeno onClick={() => setModalAparencia(true)}>Aparência</Botao></div>
            </div>
          )}
        </div>
      </nav>
      <main className="conteudo">
        {erro && (
          <div className="aviso alerta nao-imprimir" role="alert" style={{ marginBottom: 16 }}>
            <span style={{ flex: 1 }}>{erro}</span>
            <Botao pequeno variante="fantasma" onClick={limparErro}>Fechar</Botao>
          </div>
        )}
        {pagina}
      </main>
      {modalAparencia && <Aparencia aoFechar={() => setModalAparencia(false)} />}
      {(modalSenha || (trocarSenha && !!aoSair)) && (
        <TrocarSenha obrigatoria={trocarSenha} aoFechar={() => setModalSenha(false)} />
      )}
    </div>
  )
}
