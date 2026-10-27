import { simularCrediario, valorPorExtenso, vencimento } from './crediario'
import { paraCentavos } from './formatos'
import { quantidadeSugerida, totalOs, type ItemOs } from './totais'

describe('crediário', () => {
  test('sem juros: parcelas iguais e soma exata', () => {
    const s = simularCrediario({ valorCentavos: 10000, parcelas: 3, jurosMesPct: 0, metodo: 'price', primeiroVencimento: '2026-11-10' })
    expect(s.parcelas.map(p => p.valorCentavos)).toEqual([3333, 3333, 3334])
    expect(s.totalCentavos).toBe(10000)
    expect(s.jurosCentavos).toBe(0)
  })

  test('price: soma das parcelas == total', () => {
    const s = simularCrediario({ valorCentavos: 20000, parcelas: 2, jurosMesPct: 3.5, metodo: 'price', primeiroVencimento: '2026-11-10' })
    const soma = s.parcelas.reduce((a, p) => a + p.valorCentavos, 0)
    expect(soma).toBe(s.totalCentavos)
    expect(s.parcelaCentavos).toBe(10528) // 200 × 0,035 / (1 − 1,035^−2)
  })

  test('juros simples', () => {
    const s = simularCrediario({ valorCentavos: 20000, parcelas: 2, jurosMesPct: 3.5, metodo: 'simples', primeiroVencimento: '2026-11-10' })
    expect(s.totalCentavos).toBe(21400)
  })

  test('vencimento: dia 31 em mês curto vai para o último dia', () => {
    expect(vencimento('2026-01-31', 1)).toBe('2026-02-28')
    expect(vencimento('2026-01-31', 2)).toBe('2026-03-31')
    expect(vencimento('2026-11-10', 2)).toBe('2027-01-10')
  })

  test('valor por extenso', () => {
    expect(valorPorExtenso(20000)).toBe('duzentos reais')
    expect(valorPorExtenso(125050)).toBe('mil duzentos e cinquenta reais e cinquenta centavos')
    expect(valorPorExtenso(100)).toBe('um real')
  })
})

describe('totais', () => {
  test('parse de moeda e total com desconto', () => {
    expect(paraCentavos('1.234,56')).toBe(123456)
    const itens: ItemOs[] = [
      { id: '1', produtoId: null, descricao: 'Lente', unidade: 'UN', quantidade: 2, valorUnitario: 15000, desconto: 0 },
      { id: '2', produtoId: null, descricao: 'Armação', unidade: 'UN', quantidade: 1, valorUnitario: 18000, desconto: 0 },
    ]
    expect(totalOs(itens, 3000)).toBe(45000)
    expect(totalOs(itens, 999999)).toBe(0)
  })

  test('quantidade sugerida', () => {
    expect(quantidadeSugerida('lente', 'UN')).toBe(2)
    expect(quantidadeSugerida('lente', 'PAR')).toBe(1)
    expect(quantidadeSugerida('armacao', 'UN')).toBe(1)
  })
})
