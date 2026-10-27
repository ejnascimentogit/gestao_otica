import { useState, type FormEvent } from 'react'
import { Botao, Campo, Entrada } from '../components/ui'
import { sb } from '../lib/supabase'

export function LoginPage({ aviso }: { aviso?: string }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEntrando(true)
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha })
    setEntrando(false)
    if (error) setErro(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <form onSubmit={entrar} className="card" style={{ width: 'min(380px, 100%)', marginBottom: 0 }}>
        <div className="card-corpo" style={{ display: 'grid', gap: 14 }}>
          <div className="logo" style={{ padding: 0 }}>
            <span className="logo-marca">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="13" r="4" /><circle cx="17" cy="13" r="4" /><path d="M11 13h2" /></svg>
            </span>
            Gestão Ótica
          </div>
          <p className="muted" style={{ margin: 0 }}>Entre com o e-mail e a senha cadastrados para a sua loja.</p>
          {aviso && <div className="aviso alerta">{aviso}</div>}
          <Campo rotulo="E-mail">
            <Entrada id="login-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
          </Campo>
          <Campo rotulo="Senha">
            <Entrada id="login-senha" type="password" autoComplete="current-password" required value={senha} onChange={e => setSenha(e.target.value)} />
          </Campo>
          {erro && <div className="aviso alerta">{erro}</div>}
          <Botao type="submit" variante="primario" disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</Botao>
        </div>
      </form>
    </div>
  )
}
