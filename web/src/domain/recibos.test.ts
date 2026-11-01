import {
  valorPorExtenso, calcularParcelas, somarMeses, descricaoPagamento, cpfValido, cnpjValido, formatarDocumento,
  mascararDocumento, textoAutenticidade, validarRecibo, numeroRecibo,
} from './recibos'

describe('recibos', () => {
  it('valor por extenso', () => {
    expect(valorPorExtenso(10000)).toBe('cem reais')
    expect(valorPorExtenso(100)).toBe('um real')
    expect(valorPorExtenso(43900)).toBe('quatrocentos e trinta e nove reais')
    expect(valorPorExtenso(123456)).toBe('mil duzentos e trinta e quatro reais e cinquenta e seis centavos')
    expect(valorPorExtenso(200000)).toBe('dois mil reais')
    expect(valorPorExtenso(105000)).toBe('mil e cinquenta reais')
    expect(valorPorExtenso(50)).toBe('cinquenta centavos')
    expect(valorPorExtenso(100000000)).toBe('um milhão de reais')
  })

  it('parcelas', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28')
    const p = calcularParcelas(10000, 3, '2026-11-10')
    expect(p.map(x => x.valor)).toEqual([3333, 3333, 3334])
    expect(p[2].vencimento).toBe('2027-01-10')
    expect(descricaoPagamento({ forma: 'credito_parcelado', valor: 10000, parcelas: 3, primeiraParcela: '2026-11-10', dataEmissao: '2026-11-01' }))
      .toBe('Cartão de crédito parcelado em 3× de R$ 33,33 (última parcela R$ 33,34)')
    expect(descricaoPagamento({ forma: 'pix', valor: 10000, parcelas: 1, dataEmissao: '2026-11-01' })).toBe('Pix')
  })

  it('documentos', () => {
    expect(cnpjValido('29.488.278/0001-31')).toBe(true)
    expect(cnpjValido('29.488.278/0001-30')).toBe(false)
    expect(cpfValido('529.982.247-25')).toBe(true)
    expect(cpfValido('111.111.111-11')).toBe(false)
    expect(formatarDocumento('29488278000131')).toBe('29.488.278/0001-31')
    expect(mascararDocumento('52998224725')).toBe('529.982.247-25')
    expect(mascararDocumento('29488278000131')).toBe('29.488.278/0001-31')
  })

  it('texto do código de autenticidade igual ao do banco', () => {
    expect(textoAutenticidade({ id: 'a', numero: 1, codigo: 'C', data_emissao: '2026-11-01', cliente_nome: 'Ana', cliente_documento: '',
      valor: 150.5, forma_pagamento: 'pix', parcelas: 1, primeira_parcela: null, emissor_documento: '29488278000131', created_at: 'T' }))
      .toBe('a|1|C|2026-11-01|Ana||150.5|pix|1||29488278000131|T')
  })

  it('validação e número', () => {
    expect(validarRecibo({ cliente: 'Ana', documento: '', valor: 100, forma: 'pix' })).toEqual({})
    expect(Object.keys(validarRecibo({ cliente: '', documento: '123', valor: 0, forma: 'crediario_loja' })).sort()).toEqual(['cliente', 'documento', 'primeira', 'valor'])
    expect(numeroRecibo(7)).toBe('0007')
  })
})
