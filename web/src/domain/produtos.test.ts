import { margemPct, validarLaboratorio, validarProduto } from './produtos'

describe('produtos', () => {
  test('margem sobre o preço de venda', () => {
    expect(margemPct(22000, 9000)).toBe(59.1)
    expect(margemPct(10000, 10000)).toBe(0)
    expect(margemPct(0, 500)).toBeNull()
    expect(margemPct(10000, 12000)).toBe(-20)
  })

  test('validação de produto', () => {
    const base = { tipo: 'lente' as const, descricao: 'Lente 1.67', preco: 22000, custo: 9000, estoque: 10, indice: 1.67 }
    expect(validarProduto(base)).toEqual({})
    expect(validarProduto({ ...base, descricao: '  ' }).descricao).toBeDefined()
    expect(validarProduto({ ...base, preco: 0 }).preco).toBeDefined()
    expect(validarProduto({ ...base, tipo: 'servico', preco: 0, indice: null })).toEqual({})
    expect(validarProduto({ ...base, indice: 1.8 }).indice).toBeDefined()
  })

  test('validação de laboratório', () => {
    expect(validarLaboratorio({ nome: 'Lab', prazoDias: 5 })).toEqual({})
    expect(validarLaboratorio({ nome: '', prazoDias: 5 }).nome).toBeDefined()
    expect(validarLaboratorio({ nome: 'Lab', prazoDias: 120 }).prazoDias).toBeDefined()
  })
})
