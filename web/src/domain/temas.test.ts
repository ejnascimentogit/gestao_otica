import { TEMAS, gerarTema, temaCss, testarContraste, contraste, hsl, hex, rgb, pontosHarmonia, temaEhPadrao, corContorno, CONTORNO_PADRAO, temaValido } from './temas'

describe('temas', () => {
  it('conversões de cor', () => {
    expect(hex(hsl(0, 100, 50))).toBe('#ff0000')
    expect(rgb('#0E5C58')).toEqual([14, 92, 88])
    expect(contraste([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 0)
  })

  it('Clássico sem ajuste não gera CSS (fica o visual padrão)', () => {
    expect(temaEhPadrao(TEMAS[0])).toBe(true)
    expect(temaCss(TEMAS[0])).toBe('')
    expect(temaEhPadrao({ ...TEMAS[0], fundo: '#ffffff' })).toBe(false)
  })

  it('todos os temas passam de 4,5:1 no texto, nos botões e no menu, claro e escuro', () => {
    for (const t of TEMAS) {
      for (const escuro of [false, true]) {
        const ruins = testarContraste(t, escuro).filter(p => !p.ok)
        expect({ tema: t.id, escuro, ruins: ruins.map(r => `${r.rotulo} ${r.razao.toFixed(2)}`) }).toEqual({ tema: t.id, escuro, ruins: [] })
      }
    }
  })

  it('CSS tem os dois modos e as variáveis do menu', () => {
    const css = temaCss(TEMAS[3])
    expect(css).toContain('html:root[data-theme="dark"]')
    expect(css).toContain('html:root[data-theme="light"]')
    expect(css).toContain('--lateral-fundo:')
    expect(css).toContain('--marca-tinta:')
  })

  it('menu escuro deixa a lateral escura no modo claro', () => {
    const t = gerarTema(TEMAS[3], false)
    expect(contraste(t.lateral, [0, 0, 0])).toBeLessThan(3)
  })

  it('pontos da harmonia', () => {
    expect(pontosHarmonia({ h: 200, harm: 'mono' })).toEqual([200])
    expect(pontosHarmonia({ h: 200, harm: 'comp' })).toEqual([200, 20])
    expect(pontosHarmonia({ h: 10, harm: 'triade' })).toEqual([10, 130, 250])
    expect(pontosHarmonia({ h: 0, harm: 'split' })).toEqual([0, 150, 210])
  })

  it('contornos: o padrão não muda nada; fora dele vira rgba', () => {
    expect(corContorno(CONTORNO_PADRAO, false)).toBeNull()
    expect(corContorno(100, false)).toBe('rgba(29, 42, 42, 0.40)')
    expect(corContorno(0, true)).toContain('0.06')
  })

  it('valida tema salvo', () => {
    expect(temaValido(TEMAS[1])).toBe(true)
    expect(temaValido({ h: 'x' })).toBe(false)
    expect(temaValido(null)).toBe(false)
  })
})
