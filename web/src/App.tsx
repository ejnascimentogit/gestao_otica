import { useEffect, useState, type ReactNode } from 'react'
import { Icone } from './components/ui'
import { DashboardPage } from './pages/DashboardPage'
import { OrdensPage } from './pages/ordens/OrdensPage'
import { ClientesPage } from './pages/ClientesPage'
import { FinanceiroPage } from './pages/FinanceiroPage'
import { AgendaPage } from './pages/AgendaPage'
import { SimuladorPage } from './pages/SimuladorPage'

// Registro de módulos: para adicionar uma tela, inclua aqui (ver .claude/skills/nova-tela)
const MODULOS: Array<{ rota: string; rotulo: string; icone: ReactNode; grupo?: string }> = [
  { rota: 'painel', rotulo: 'Painel', icone: Icone.painel },
  { rota: 'ordens', rotulo: 'Ordens de serviço', icone: Icone.os, grupo: 'Atendimento' },
  { rota: 'agenda', rotulo: 'Agenda', icone: Icone.agenda },
  { rota: 'simulador', rotulo: 'Simulador de lentes', icone: Icone.simulador },
  { rota: 'clientes', rotulo: 'Clientes', icone: Icone.clientes, grupo: 'Cadastros' },
  { rota: 'financeiro', rotulo: 'Financeiro', icone: Icone.financeiro, grupo: 'Gestão' },
]

const rotaAtual = () => window.location.hash.replace(/^#\/?/, '') || 'painel'

export default function App() {
  const [rota, setRota] = useState(rotaAtual)
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    const f = () => { setRota(rotaAtual()); setMenuAberto(false) }
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])

  const irPara = (r: string) => { window.location.hash = r }

  const pagina = {
    painel: <DashboardPage irPara={irPara} />,
    ordens: <OrdensPage />,
    agenda: <AgendaPage />,
    simulador: <SimuladorPage />,
    clientes: <ClientesPage />,
    financeiro: <FinanceiroPage />,
  }[rota] ?? <DashboardPage irPara={irPara} />

  return (
    <div className="app">
      <header className="topo-mobile">
        <button className="botao fantasma pequeno" aria-label="Menu" onClick={() => setMenuAberto(true)}>{Icone.menu}</button>
        Gestão Ótica
      </header>
      <nav className={`lateral ${menuAberto ? 'aberta' : ''}`} onClick={e => e.target === e.currentTarget && setMenuAberto(false)}>
        <div className="logo">
          <span className="logo-marca">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="13" r="4" /><circle cx="17" cy="13" r="4" /><path d="M11 13h2" /></svg>
          </span>
          Gestão Ótica
        </div>
        {MODULOS.map(m => (
          <div key={m.rota}>
            {m.grupo && <div className="menu-grupo">{m.grupo}</div>}
            <a href={`#${m.rota}`} className={`menu-item ${rota === m.rota ? 'ativo' : ''}`} onClick={() => setMenuAberto(false)}>
              {m.icone}{m.rotulo}
            </a>
          </div>
        ))}
        <div className="lateral-rodape">Protótipo · dados de exemplo</div>
      </nav>
      <main className="conteudo">{pagina}</main>
    </div>
  )
}
