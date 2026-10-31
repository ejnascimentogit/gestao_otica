import { larguraArmacaoMm, posicionarPelosOlhos, posicaoPadrao, trocarArmacao, aplicarPinca, LARGURA_PADRAO_MM } from './provador'

describe('provador', () => {
  it('largura pela medida gravada na haste', () => {
    expect(larguraArmacaoMm('BB90169 55-18')).toBe(138)
    expect(larguraArmacaoMm('55□18-144 C7')).toBe(138)
    expect(larguraArmacaoMm('GN0809 C2 55-20-141')).toBe(140)
    expect(larguraArmacaoMm('143 C2')).toBe(LARGURA_PADRAO_MM)
    expect(larguraArmacaoMm(null)).toBe(LARGURA_PADRAO_MM)
    expect(larguraArmacaoMm('99-99')).toBe(LARGURA_PADRAO_MM)
  })

  it('posiciona pelos olhos', () => {
    // olhos a 126 px: 2 px por mm → armação de 138 mm = 276 px
    const p = posicionarPelosOlhos({ x: 437, y: 300 }, { x: 311, y: 300 }, 138)
    expect(p.largura).toBeCloseTo(276)
    expect(p.cx).toBe(374)
    expect(p.angulo).toBeCloseTo(0)
    const inclinado = posicionarPelosOlhos({ x: 0, y: 0 }, { x: 100, y: 100 }, 138)
    expect(inclinado.angulo).toBeCloseTo(45)
  })

  it('padrão, troca e pinça', () => {
    expect(posicaoPadrao(1000, 1200)).toEqual({ cx: 500, cy: 504, largura: 600, angulo: 0 })
    expect(trocarArmacao({ cx: 0, cy: 0, largura: 276, angulo: 0 }, 138, 140).largura).toBeCloseTo(280)
    const p = aplicarPinca({ cx: 100, cy: 100, largura: 200, angulo: 0 },
      [{ x: 0, y: 0 }, { x: 100, y: 0 }], [{ x: 10, y: 0 }, { x: 210, y: 0 }], 2)
    expect(p.largura).toBeCloseTo(400)
    expect(p.cx).toBeCloseTo(130)
  })
})
