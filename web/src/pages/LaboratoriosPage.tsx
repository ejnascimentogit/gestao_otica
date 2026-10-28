import { useState } from 'react'
import { Badge, Botao, Card, Campo, Entrada, Icone, Modal, PageHeader } from '../components/ui'
import { validarLaboratorio } from '../domain/produtos'
import { novoId, salvarLaboratorio, tentar, useStore, type Laboratorio } from '../data/store'

const novoLab = (): Laboratorio => ({ id: novoId(), nome: '', prazoDias: 7, telefone: '', ativo: true })

export function LaboratoriosPage() {
  const { laboratorios, ordens } = useStore()
  const [editando, setEditando] = useState<Laboratorio | null>(null)

  const emAberto = (id: string) => ordens.filter(o => o.laboratorioId === id && o.status === 'em_laboratorio').length

  return (
    <div>
      <PageHeader titulo="Laboratórios" sub="Para onde as lentes são enviadas. O prazo sugere a data de entrega da OS."
        acoes={<Botao variante="primario" onClick={() => setEditando(novoLab())}>{Icone.mais} Novo laboratório</Botao>} />

      <Card sem_padding>
        {laboratorios.length === 0 ? <div className="vazio">Nenhum laboratório cadastrado.</div> : (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>Nome</th><th className="col-sec">Telefone</th><th className="num">Prazo</th><th className="num">OS no laboratório</th><th>Situação</th></tr></thead>
              <tbody>
                {laboratorios.map(l => (
                  <tr key={l.id} className="clicavel" onClick={() => setEditando({ ...l })}>
                    <td><b>{l.nome}</b></td>
                    <td className="muted col-sec">{l.telefone || '—'}</td>
                    <td className="num">{l.prazoDias} dias</td>
                    <td className="num">{emAberto(l.id)}</td>
                    <td>{l.ativo ? <Badge tom="ok">Ativo</Badge> : <Badge tom="neutro">Inativo</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editando && <ModalLaboratorio inicial={editando} aoFechar={() => setEditando(null)} />}
    </div>
  )
}

function ModalLaboratorio({ inicial, aoFechar }: { inicial: Laboratorio; aoFechar: () => void }) {
  const { laboratorios } = useStore()
  const [l, setL] = useState<Laboratorio>(inicial)
  const [tentouSalvar, setTentouSalvar] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const existente = laboratorios.some(x => x.id === l.id)
  const erros = validarLaboratorio(l)
  const mostrar = (k: string) => (tentouSalvar ? erros[k] : undefined)
  const upd = (patch: Partial<Laboratorio>) => setL(x => ({ ...x, ...patch }))

  async function salvar() {
    setTentouSalvar(true)
    if (Object.keys(erros).length) return
    setSalvando(true)
    const ok = await tentar(() => salvarLaboratorio(l))
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Modal titulo={existente ? 'Editar laboratório' : 'Novo laboratório'} aoFechar={aoFechar} rodape={<>
      {existente && (
        <Botao variante="fantasma" style={{ marginRight: 'auto' }} onClick={() => upd({ ativo: !l.ativo })}>
          {l.ativo ? 'Desativar' : 'Reativar'}
        </Botao>
      )}
      <Botao onClick={aoFechar}>Cancelar</Botao>
      <Botao variante="primario" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar'}</Botao>
    </>}>
      {!l.ativo && <div className="aviso alerta" style={{ marginBottom: 12 }}>Laboratório inativo: não aparece para novas OS.</div>}
      <div className="grade">
        <Campo rotulo="Nome *" erro={mostrar('nome')} style={{ gridColumn: '1 / -1' }}>
          <Entrada id="lab-nome" autoFocus invalida={!!mostrar('nome')} value={l.nome} onChange={e => upd({ nome: e.target.value })} />
        </Campo>
        <Campo rotulo="Telefone / WhatsApp"><Entrada id="lab-telefone" value={l.telefone ?? ''} onChange={e => upd({ telefone: e.target.value })} /></Campo>
        <Campo rotulo="Prazo de entrega (dias)" erro={mostrar('prazoDias')}>
          <Entrada id="lab-prazo" type="number" className="num" min={0} max={90} invalida={!!mostrar('prazoDias')} value={l.prazoDias} onChange={e => upd({ prazoDias: Math.round(Number(e.target.value)) })} />
        </Campo>
      </div>
    </Modal>
  )
}
