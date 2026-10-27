import { calcularPerto, formatarDioptria, parseDioptria, receitaVazia, sugerirIndice, transporCilindro, validarReceita } from './receita'

describe('receita', () => {
  test('parse e formatação', () => {
    expect(parseDioptria('-1,25')).toBe(-1.25)
    expect(parseDioptria('+2.5')).toBe(2.5)
    expect(parseDioptria('plano')).toBe(0)
    expect(parseDioptria('-1,30')).toBe(-1.25)
    expect(formatarDioptria(2.25)).toBe('+2,25')
    expect(formatarDioptria(-0.5)).toBe('-0,50')
    expect(formatarDioptria(0)).toBe('Plano')
  })

  test('cálculo de perto soma a adição e repete cilindro/eixo', () => {
    expect(calcularPerto({ esf: -2, cil: -0.75, eixo: 90 }, 2)).toEqual({ esf: 0, cil: -0.75, eixo: 90 })
    expect(calcularPerto({ esf: 1.25, cil: null, eixo: null }, 1.5)).toEqual({ esf: 2.75, cil: null, eixo: null })
    expect(calcularPerto({ esf: 1, cil: null, eixo: null }, null)).toEqual({ esf: 1, cil: null, eixo: null })
  })

  test('transposição ida e volta retorna ao original', () => {
    const o = { esf: -1.5, cil: -1.25, eixo: 30 }
    const t = transporCilindro(o)
    expect(t).toEqual({ esf: -2.75, cil: 1.25, eixo: 120 })
    expect(transporCilindro(t)).toEqual(o)
  })

  test('sugestão de índice pelo maior meridiano', () => {
    const r = receitaVazia()
    r.longe.od = { esf: -3, cil: -2, eixo: 180 } // meridiano -5,00
    expect(sugerirIndice(r).indice).toBe(1.67)
  })

  test('validação', () => {
    const r = receitaVazia()
    r.longe.od = { esf: -1, cil: -0.5, eixo: null }
    r.dnp.od = 50
    const e = validarReceita(r)
    expect(e['longe.od.eixo']).toBeDefined()
    expect(e['dnp.od']).toBeDefined()
  })
})
