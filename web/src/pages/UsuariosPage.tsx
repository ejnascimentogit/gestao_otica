import { useState } from 'react'
import { Badge, Botao, Card, Campo, Entrada, Icone, Modal, PageHeader, Selecao } from '../components/ui'
import { emailValido, gerarSenhaProvisoria, validarSenhaProvisoria } from '../domain/usuarios'
import {
  PAPEIS, alterarUsuario, criarUsuario, redefinirSenhaUsuario, tentar, useStore, type Papel, type Usuario,
} from '../data/store'

export function UsuariosPage() {
  const { usuarios, perfilId, papel } = useStore()
  const [novo, setNovo] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [aviso, setAviso] = useState('')

  if (papel !== 'admin' && papel !== 'gerente') {
    return <div><PageHeader titulo="Usuários" /><Card><p className="muted" style={{ margin: 0 }}>Só administrador ou gerente pode ver e cadastrar usuários.</p></Card></div>
  }

  return (
    <div>
      <PageHeader titulo="Usuários" sub="Quem entra no sistema desta loja. Vendedores ativos aparecem na OS."
        acoes={<Botao variante="primario" onClick={() => setNovo(true)}>{Icone.mais} Novo usuário</Botao>} />

      {aviso && (
        <div className="aviso info" style={{ marginBottom: 16 }}>
          <span style={{ flex: 1 }}>{aviso}</span>
          <Botao pequeno variante="fantasma" onClick={() => setAviso('')}>ok</Botao>
        </div>
      )}

      <Card sem_padding>
        <div className="tabela-wrap">
          <table className="tabela">
            <thead><tr><th>Nome</th><th className="col-sec">E-mail</th><th>Papel</th><th>Situação</th></tr></thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className="clicavel" onClick={() => setEditando({ ...u })}>
                  <td><b>{u.nome}</b>{u.id === perfilId && <span className="fraco"> (você)</span>}<div className="fraco" style={{ wordBreak: 'break-all' }}>{u.email}</div></td>
                  <td className="col-sec muted">{u.email}</td>
                  <td>{PAPEIS[u.papel] ?? u.papel}</td>
                  <td>{u.ativo ? <Badge tom="ok">Ativo</Badge> : <Badge tom="neutro">Inativo</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {novo && <ModalNovo souAdmin={papel === 'admin'} aoFechar={() => setNovo(false)} aoCriar={(senha, email, existente) => {
        setNovo(false)
        setAviso(existente
          ? `${email} já tinha login em outro lugar e agora também acessa esta loja, com a senha que já usava.`
          : `Usuário criado. Passe para a pessoa: e-mail ${email} e senha provisória ${senha}. No primeiro acesso o sistema pede uma senha nova.`)
      }} />}
      {editando && <ModalEditar u={editando} souEu={editando.id === perfilId} souAdmin={papel === 'admin'}
        aoFechar={() => setEditando(null)} aoRedefinir={(senha) => {
          setEditando(null)
          setAviso(`Senha de ${editando.nome} redefinida para ${senha}. No próximo acesso o sistema pede uma senha nova.`)
        }} />}
    </div>
  )
}

function SeletorPapel({ id, valor, aoMudar, souAdmin, desabilitado }: { id: string; valor: Papel; aoMudar: (p: Papel) => void; souAdmin: boolean; desabilitado?: boolean }) {
  return (
    <Selecao id={id} value={valor} disabled={desabilitado} onChange={e => aoMudar(e.target.value as Papel)}>
      {(Object.keys(PAPEIS) as Papel[]).filter(p => souAdmin || p !== 'admin' || valor === 'admin').map(p => <option key={p} value={p}>{PAPEIS[p]}</option>)}
    </Selecao>
  )
}

function ModalNovo({ souAdmin, aoFechar, aoCriar }: { souAdmin: boolean; aoFechar: () => void; aoCriar: (senha: string, email: string, existente: boolean) => void }) {
  const [f, setF] = useState({ nome: '', email: '', papel: 'vendedor' as Papel, senha: gerarSenhaProvisoria() })
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const erros = {
    nome: f.nome.trim() ? '' : 'Informe o nome',
    email: emailValido(f.email) ? '' : 'E-mail inválido',
    senha: validarSenhaProvisoria(f.senha) ?? '',
  }
  const temErro = Object.values(erros).some(Boolean)

  async function salvar() {
    setTentou(true)
    if (temErro) return
    setSalvando(true)
    const r = await tentar(() => criarUsuario({ ...f, email: f.email.trim().toLowerCase() }))
    setSalvando(false)
    if (r) aoCriar(f.senha, f.email.trim().toLowerCase(), r.loginExistente)
  }

  return (
    <Modal titulo="Novo usuário" aoFechar={aoFechar} rodape={<>
      <Botao onClick={aoFechar}>Cancelar</Botao>
      <Botao variante="primario" disabled={salvando} onClick={salvar}>{salvando ? 'Criando…' : 'Criar usuário'}</Botao>
    </>}>
      <div className="grade">
        <Campo rotulo="Nome *" erro={tentou ? erros.nome : ''} style={{ gridColumn: '1 / -1' }}>
          <Entrada id="usu-nome" autoFocus invalida={tentou && !!erros.nome} value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} />
        </Campo>
        <Campo rotulo="E-mail *" erro={tentou ? erros.email : ''} style={{ gridColumn: '1 / -1' }}>
          <Entrada id="usu-email" type="email" autoComplete="off" invalida={tentou && !!erros.email} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        </Campo>
        <Campo rotulo="Papel"><SeletorPapel id="usu-papel" valor={f.papel} souAdmin={souAdmin} aoMudar={p => setF({ ...f, papel: p })} /></Campo>
        <Campo rotulo="Senha provisória" erro={tentou ? erros.senha : ''}>
          <Entrada id="usu-senha" autoComplete="off" value={f.senha} onChange={e => setF({ ...f, senha: e.target.value })} />
        </Campo>
      </div>
      <p className="fraco" style={{ marginBottom: 0 }}>A pessoa entra com essa senha e o sistema pede para ela criar uma senha própria no primeiro acesso.</p>
    </Modal>
  )
}

function ModalEditar({ u, souEu, souAdmin, aoFechar, aoRedefinir }: {
  u: Usuario; souEu: boolean; souAdmin: boolean; aoFechar: () => void; aoRedefinir: (senha: string) => void
}) {
  const [f, setF] = useState({ nome: u.nome, papel: u.papel, ativo: u.ativo })
  const [salvando, setSalvando] = useState(false)
  const [senhaNova, setSenhaNova] = useState<string | null>(null)
  const bloqueadoAdmin = u.papel === 'admin' && !souAdmin

  async function salvar() {
    const mudar: Partial<Pick<Usuario, 'nome' | 'papel' | 'ativo'>> = {}
    if (f.nome.trim() && f.nome.trim() !== u.nome) mudar.nome = f.nome.trim()
    if (f.papel !== u.papel) mudar.papel = f.papel
    if (f.ativo !== u.ativo) mudar.ativo = f.ativo
    if (!Object.keys(mudar).length) { aoFechar(); return }
    setSalvando(true)
    const ok = await tentar(() => alterarUsuario(u.id, mudar))
    setSalvando(false)
    if (ok !== null) aoFechar()
  }

  async function redefinir() {
    const s = gerarSenhaProvisoria()
    setSalvando(true)
    const ok = await tentar(() => redefinirSenhaUsuario(u.id, s))
    setSalvando(false)
    if (ok !== null) aoRedefinir(s)
  }

  return (
    <Modal titulo={`Usuário · ${u.nome}`} aoFechar={aoFechar} rodape={<>
      {!souEu && !bloqueadoAdmin && (
        <Botao variante="fantasma" style={{ marginRight: 'auto' }} disabled={salvando}
          onClick={() => (senhaNova === null ? setSenhaNova('confirmar') : redefinir())}>
          {senhaNova === null ? 'Redefinir senha' : 'Confirmar: gerar senha provisória'}
        </Botao>
      )}
      <Botao onClick={aoFechar}>Cancelar</Botao>
      <Botao variante="primario" disabled={salvando || bloqueadoAdmin} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar'}</Botao>
    </>}>
      {bloqueadoAdmin && <div className="aviso alerta" style={{ marginBottom: 12 }}>Só o administrador pode alterar outro administrador.</div>}
      {souEu && <div className="aviso info" style={{ marginBottom: 12 }}>Este é o seu usuário. Para trocar a sua senha, use "Trocar senha" no menu.</div>}
      <div className="grade">
        <Campo rotulo="Nome" style={{ gridColumn: '1 / -1' }}>
          <Entrada id="edit-nome" disabled={bloqueadoAdmin} value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} />
        </Campo>
        <Campo rotulo="E-mail" style={{ gridColumn: '1 / -1' }}><Entrada id="edit-email" disabled value={u.email} /></Campo>
        <Campo rotulo="Papel"><SeletorPapel id="edit-papel" valor={f.papel} souAdmin={souAdmin} desabilitado={souEu || bloqueadoAdmin} aoMudar={p => setF({ ...f, papel: p })} /></Campo>
        <Campo rotulo="Situação">
          <Selecao id="edit-ativo" value={f.ativo ? 'sim' : 'nao'} disabled={souEu || bloqueadoAdmin} onChange={e => setF({ ...f, ativo: e.target.value === 'sim' })}>
            <option value="sim">Ativo</option>
            <option value="nao">Inativo (não entra no sistema)</option>
          </Selecao>
        </Campo>
      </div>
      {senhaNova === 'confirmar' && <p className="fraco" style={{ marginBottom: 0 }}>Clique de novo para gerar uma senha provisória. A senha atual de {u.nome} deixa de funcionar.</p>}
    </Modal>
  )
}
