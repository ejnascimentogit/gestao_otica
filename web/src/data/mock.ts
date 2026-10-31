// Dados de exemplo para o modo demonstração (protótipo publicado, sem banco).
import { hojeISO, somarDias } from '../domain/formatos'
import { receitaVazia } from '../domain/receita'
import type { ItemOs } from '../domain/totais'
import type { Agendamento, Catalogo, Interessado, Cliente, Laboratorio, OrdemServico, Parcela, Produto, StatusOs, Vendedor } from './store'

const uid = () => Math.random().toString(36).slice(2, 10)
const hoje = hojeISO()

const clientes: Cliente[] = [
  { id: 'c1', nome: 'Maria das Graças Lima', cpf: '123.456.789-00', celular: '(81) 99876-5432', endereco: 'Rua do Sol, 120 — Boa Vista, Recife/PE' },
  { id: 'c2', nome: 'José Carlos Albuquerque', cpf: '987.654.321-00', celular: '(81) 98765-1234', endereco: 'Av. Norte, 455 — Casa Amarela, Recife/PE' },
  { id: 'c3', nome: 'Ana Beatriz Moura', cpf: '456.789.123-00', celular: '(81) 99123-4567' },
  { id: 'c4', nome: 'Roberto Fernandes', cpf: '321.654.987-00', celular: '(81) 99555-0101' },
]

const produtosBase: Omit<Produto, 'custo' | 'ativo'>[] = [
  { id: 'p1', tipo: 'lente', descricao: 'Lente monofocal 1.56 antirreflexo', marca: 'Genérica', unidade: 'UN', preco: 9000, indice: 1.56, estoque: 40 },
  { id: 'p2', tipo: 'lente', descricao: 'Lente monofocal 1.67 filtro azul', marca: 'Genérica', unidade: 'UN', preco: 22000, indice: 1.67, estoque: 18 },
  { id: 'p3', tipo: 'lente', descricao: 'Lente multifocal freeform 1.59', marca: 'Genérica', unidade: 'PAR', preco: 89000, indice: 1.59, estoque: 6 },
  { id: 'p4', tipo: 'lente', descricao: 'Lente fotossensível 1.56 + AR', marca: 'Genérica', unidade: 'UN', preco: 31000, indice: 1.56, estoque: 12 },
  { id: 'p5', tipo: 'armacao', descricao: 'Armação acetato retangular 54-18', marca: 'Casa', unidade: 'UN', preco: 24000, estoque: 9 },
  { id: 'p6', tipo: 'armacao', descricao: 'Armação metal redonda 50-20', marca: 'Casa', unidade: 'UN', preco: 19900, estoque: 5 },
  { id: 'p7', tipo: 'servico', descricao: 'Montagem e ajuste', marca: '—', unidade: 'UN', preco: 3000, estoque: 0 },
]

const laboratoriosBase: Omit<Laboratorio, 'ativo'>[] = [
  { id: 'l1', nome: 'Lab Óptico Recife', prazoDias: 5 },
  { id: 'l2', nome: 'Surfaçagem Nordeste', prazoDias: 7 },
]

// Fotos de exemplo do catálogo: desenhos simples de armação (feitos para o projeto)
function fotoArmacao(cor: string, formato: 'redonda' | 'retangular' | 'gatinho'): string {
  const lente = formato === 'redonda'
    ? (x: number) => `<circle cx="${x}" cy="60" r="34"/>`
    : formato === 'retangular'
      ? (x: number) => `<rect x="${x - 40}" y="34" width="80" height="54" rx="12"/>`
      : (x: number) => `<path d="M${x - 42} 44 Q${x} 26 ${x + 42} 38 Q${x + 40} 92 ${x} 90 Q${x - 38} 88 ${x - 42} 44Z"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 160"><rect width="300" height="160" fill="#f3f1ec"/>`
    + `<g fill="none" stroke="${cor}" stroke-width="7" stroke-linejoin="round">${lente(98)}${lente(202)}<path d="M132 56 Q150 44 168 56"/>`
    + `<path d="M${formato === 'redonda' ? 64 : 58} 52 L18 44M${formato === 'redonda' ? 236 : 242} 52 L282 44"/></g></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const armacoesCatalogo: Omit<Produto, 'custo' | 'ativo'>[] = [
  { id: 'p8', tipo: 'armacao', descricao: 'Armação gatinho acetato vinho', marca: 'Casa', unidade: 'UN', preco: 27900, estoque: 4, fotoUrl: fotoArmacao('#7a2340', 'gatinho'), noCatalogo: true, provadorUrl: '/exemplos/armacoes/provador/gatinho-vinho.svg', codigo: '54-17' },
  { id: 'p9', tipo: 'armacao', descricao: 'Armação redonda metal dourada', marca: 'Casa', unidade: 'UN', preco: 21900, estoque: 6, fotoUrl: fotoArmacao('#b8892f', 'redonda'), noCatalogo: true, provadorUrl: '/exemplos/armacoes/provador/redonda-dourada.svg', codigo: '50-20' },
  { id: 'p10', tipo: 'armacao', descricao: 'Armação retangular preta fosca', marca: 'Casa', unidade: 'UN', preco: 18900, estoque: 8, fotoUrl: fotoArmacao('#22262a', 'retangular'), noCatalogo: true, provadorUrl: '/exemplos/armacoes/provador/retangular-preta.svg', codigo: '54-18' },
]

const produtos: Produto[] = [...produtosBase, ...armacoesCatalogo].map(p => ({
  ...p, custo: Math.round(p.preco * 0.42), ativo: true,
  ...(p.id === 'p5' ? { fotoUrl: fotoArmacao('#1f3a5f', 'retangular'), noCatalogo: true, provadorUrl: '/exemplos/armacoes/provador/oval-azul.svg' } : {}),
}))
const laboratorios: Laboratorio[] = laboratoriosBase.map(l => ({ ...l, ativo: true }))

const vendedores: Vendedor[] = [
  { id: 'v1', nome: 'Carla' },
  { id: 'v2', nome: 'Paulo' },
]

function osExemplo(numero: number, clienteId: string, status: StatusOs, dias: number, itens: Array<[string, number]>, pago: number): OrdemServico {
  const r = receitaVazia()
  r.longe.od = { esf: -1.75, cil: -0.5, eixo: 180 }
  r.longe.oe = { esf: -2, cil: -0.75, eixo: 170 }
  r.dnp = { od: 31.5, oe: 32 }
  r.altura = { od: 19, oe: 19 }
  const its: ItemOs[] = itens.map(([pid, qtd]) => {
    const p = produtos.find(x => x.id === pid)!
    return { id: uid(), produtoId: pid, descricao: p.descricao, unidade: p.unidade, quantidade: qtd, valorUnitario: p.preco, desconto: 0 }
  })
  return {
    id: uid(), numero, clienteId, vendedorId: 'v1', laboratorioId: 'l1', status,
    dataOs: somarDias(hoje, -dias), previsao: somarDias(hoje, 5 - dias), controleInterno: '', observacoes: '',
    receita: r, itens: its, descontoGeral: 0,
    pagamentos: pago ? [{ id: uid(), forma: 'pix', valor: pago, em: somarDias(hoje, -dias) }] : [],
    crediario: null,
  }
}

const ordens: OrdemServico[] = [
  osExemplo(1, 'c1', 'finalizada', 12, [['p2', 2], ['p5', 1]], 68000),
  osExemplo(2, 'c2', 'em_laboratorio', 4, [['p3', 1], ['p6', 1]], 40000),
  osExemplo(3, 'c3', 'aguardando_retirada', 7, [['p1', 2], ['p5', 1], ['p7', 1]], 15000),
  osExemplo(4, 'c4', 'orcamento', 0, [['p4', 2]], 0),
]

const parcelas: Parcela[] = [
  { id: uid(), osNumero: 2, clienteId: 'c2', numero: 1, vencimento: somarDias(hoje, 10), valorCentavos: 35450, pago: false },
  { id: uid(), osNumero: 2, clienteId: 'c2', numero: 2, vencimento: somarDias(hoje, 40), valorCentavos: 35450, pago: false },
  { id: uid(), osNumero: 3, clienteId: 'c3', numero: 1, vencimento: somarDias(hoje, -3), valorCentavos: 18000, pago: false },
]

const agendamentos: Agendamento[] = [
  { id: uid(), clienteNome: 'Ana Beatriz Moura', tipo: 'Retirada', inicio: `${hoje}T10:00`, status: 'agendado' },
  { id: uid(), clienteNome: 'Fernanda Rocha', tipo: 'Exame de vista', inicio: `${hoje}T14:30`, status: 'agendado' },
  { id: uid(), clienteNome: 'Roberto Fernandes', tipo: 'Ajuste', inicio: `${somarDias(hoje, 1)}T09:00`, status: 'agendado' },
]

const catalogo: Catalogo = {
  slug: 'otica-exemplo', ativo: true, whatsapp: '5581999990000',
  titulo: 'Nossas armações', apresentacao: 'Escolha com calma e toque em "Tenho interesse" para falar com a gente pelo WhatsApp.',
}

const interessados: Interessado[] = [
  { id: 'i1', produtoId: 'p8', produtoDescricao: 'Armação gatinho acetato vinho', nome: 'Juliana Cavalcanti', whatsapp: '5581988887777', status: 'novo', clienteId: null, criadoEm: new Date(Date.now() - 40 * 60000).toISOString() },
  { id: 'i2', produtoId: 'p10', produtoDescricao: 'Armação retangular preta fosca', nome: 'Marcos Vinícius', whatsapp: '5581977776666', status: 'em_contato', clienteId: null, criadoEm: new Date(Date.now() - 26 * 3600000).toISOString() },
]

export const dadosDemo = () => ({
  catalogoDisponivel: true, provadorDisponivel: true, catalogo, interessados,
  loja: { id: 'demo', nome: 'Ótica Exemplo', cnpj: '00.000.000/0001-00', telefone: '(81) 3333-0000', endereco: 'Rua Exemplo, 100 — Recife/PE' },
  clientes, produtos, laboratorios, vendedores, ordens, parcelas, agendamentos,
})
