import { useState } from 'react'
import { Botao, Campo, Entrada, Modal } from './ui'
import { validarNovaSenha } from '../domain/usuarios'
import { trocarMinhaSenha } from '../data/store'

/** `obrigatoria`: primeiro acesso com senha provisória — não dá para fechar sem trocar. */
export function TrocarSenha({ obrigatoria, aoFechar }: { obrigatoria?: boolean; aoFechar: () => void }) {
  const [senha, setSenha] = useState('')
  const [conf, setConf] = useState('')
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    const e = validarNovaSenha(senha, conf)
    if (e) { setErro(e); return }
    setErro('')
    setSalvando(true)
    try {
      await trocarMinhaSenha(senha)
      setOk(true)
    } catch (x) {
      setErro(x instanceof Error ? x.message : String(x))
    } finally {
      setSalvando(false)
    }
  }

  const fechar = obrigatoria && !ok ? () => {} : aoFechar

  return (
    <Modal titulo={obrigatoria ? 'Crie a sua senha' : 'Trocar senha'} aoFechar={fechar} rodape={ok
      ? <Botao variante="primario" onClick={aoFechar}>Continuar</Botao>
      : <>
          {!obrigatoria && <Botao onClick={aoFechar}>Cancelar</Botao>}
          <Botao variante="primario" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar senha'}</Botao>
        </>}>
      {ok ? (
        <p style={{ margin: 0 }}>Senha alterada. Use a nova senha no próximo acesso.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {obrigatoria && <p className="muted" style={{ margin: 0 }}>Você entrou com uma senha provisória. Crie uma senha só sua para continuar.</p>}
          <Campo rotulo="Nova senha">
            <Entrada id="nova-senha" type="password" autoComplete="new-password" autoFocus value={senha} onChange={e => setSenha(e.target.value)} />
          </Campo>
          <Campo rotulo="Repita a nova senha">
            <Entrada id="nova-senha-conf" type="password" autoComplete="new-password" value={conf} onChange={e => setConf(e.target.value)} />
          </Campo>
          <p className="fraco" style={{ margin: 0 }}>Pelo menos 8 caracteres, misturando letras e números.</p>
          {erro && <div className="aviso alerta" role="alert">{erro}</div>}
        </div>
      )}
    </Modal>
  )
}
