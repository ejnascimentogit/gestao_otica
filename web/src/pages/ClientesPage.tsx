import { useState } from 'react'
import { Botao, Card, Campo, Entrada, Icone, Modal, PageHeader } from '../components/ui'
import { formatarData, formatarMoeda } from '../domain/formatos'
import { totalOs } from '../domain/totais'
import { salvarCliente, useStore } from '../data/store'

export function ClientesPage() {
  const { clientes, ordens } = useStore()
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState(false)
  const [form, setForm] = useState({ nome: '', cpf: '', celular: '', endereco: '' })

  const lista = clientes.filter(c => (c.nome + c.cpf + c.celular).toLowerCase().includes(busca.toLowerCase()))

  return (
    <div>
      <PageHeader titulo="Clientes" sub={`${clientes.length} cadastrados`} acoes={<Botao variante="primario" onClick={() => setNovo(true)}>{Icone.mais} Novo cliente</Botao>} />
      <div style={{ maxWidth: 360, marginBottom: 12 }}><Entrada placeholder="Buscar por nome, CPF ou celular" value={busca} onChange={e => setBusca(e.target.value)} /></div>
      <Card sem_padding>
        <div className="tabela-wrap">
          <table className="tabela">
            <thead><tr><th>Nome</th><th>CPF</th><th>Celular</th><th className="num">OS</th><th>Última compra</th><th className="num">Total comprado</th></tr></thead>
            <tbody>
              {lista.map(c => {
                const os = ordens.filter(o => o.clienteId === c.id && o.status !== 'cancelada' && o.status !== 'orcamento')
                const ultima = os.map(o => o.dataOs).sort().at(-1)
                return (
                  <tr key={c.id}>
                    <td><b>{c.nome}</b>{c.endereco && <div className="fraco">{c.endereco}</div>}</td>
                    <td>{c.cpf}</td>
                    <td>{c.celular}</td>
                    <td className="num">{os.length}</td>
                    <td>{formatarData(ultima)}</td>
                    <td className="num">{formatarMoeda(os.reduce((s, o) => s + totalOs(o.itens, o.descontoGeral), 0))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {novo && (
        <Modal titulo="Novo cliente" aoFechar={() => setNovo(false)} rodape={<>
          <Botao onClick={() => setNovo(false)}>Cancelar</Botao>
          <Botao variante="primario" disabled={!form.nome.trim()} onClick={() => { salvarCliente(form); setNovo(false); setForm({ nome: '', cpf: '', celular: '', endereco: '' }) }}>Salvar</Botao>
        </>}>
          <div className="grade">
            <Campo rotulo="Nome *" style={{ gridColumn: '1 / -1' }}><Entrada autoFocus value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></Campo>
            <Campo rotulo="CPF/CNPJ"><Entrada value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} /></Campo>
            <Campo rotulo="Celular (WhatsApp)"><Entrada value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })} /></Campo>
            <Campo rotulo="Endereço" style={{ gridColumn: '1 / -1' }}><Entrada value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} /></Campo>
          </div>
        </Modal>
      )}
    </div>
  )
}
