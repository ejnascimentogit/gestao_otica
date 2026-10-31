import {
  normalizarWhatsapp, formatarWhatsapp, gerarSlug, slugValido, urlCatalogo, slugDoCaminho, linkWhatsapp,
  mensagemInteresse, mensagemRetorno, validarInteresse, validarConfigCatalogo,
} from './catalogo'

describe('catálogo', () => {
  it('normaliza WhatsApp do Brasil', () => {
    expect(normalizarWhatsapp('(81) 99876-5432')).toBe('5581998765432')
    expect(normalizarWhatsapp('081 3333-0000')).toBe('558133330000')
    expect(normalizarWhatsapp('+55 11 95683-2820')).toBe('5511956832820')
    expect(normalizarWhatsapp('9876-5432')).toBeNull()
    expect(normalizarWhatsapp('(10) 99876-5432')).toBeNull()
    expect(normalizarWhatsapp('')).toBeNull()
  })

  it('formata para exibir', () => {
    expect(formatarWhatsapp('5581998765432')).toBe('(81) 99876-5432')
    expect(formatarWhatsapp('558133330000')).toBe('(81) 3333-0000')
  })

  it('gera endereço do catálogo', () => {
    expect(gerarSlug('Ótica Nascimento')).toBe('otica-nascimento')
    expect(gerarSlug('  Óculos & Cia. — Recife ')).toBe('oculos-cia-recife')
    expect(slugValido('otica-nascimento')).toBe(true)
    expect(slugValido('-ab')).toBe(false)
    expect(slugValido('Ótica')).toBe(false)
    expect(urlCatalogo('https://x.dev/', 'otica')).toBe('https://x.dev/catalogo/otica')
    expect(slugDoCaminho('/catalogo/otica-nascimento')).toBe('otica-nascimento')
    expect(slugDoCaminho('/catalogo/')).toBeNull()
    expect(slugDoCaminho('/')).toBeNull()
  })

  it('monta link do wa.me', () => {
    expect(linkWhatsapp('(81) 99876-5432', 'Olá & tchau')).toBe('https://wa.me/5581998765432?text=Ol%C3%A1%20%26%20tchau')
    expect(linkWhatsapp(null, 'oi')).toBe('https://wa.me/?text=oi')
  })

  it('mensagens prontas', () => {
    expect(mensagemInteresse({ loja: 'Ótica Nascimento', nomeCliente: 'Ana Beatriz', produto: 'Armação redonda', preco: 19900 }))
      .toBe('Olá! Sou Ana. Vi no catálogo da Ótica Nascimento o modelo *Armação redonda* (R$ 199,00) e tenho interesse.')
    expect(mensagemRetorno({ loja: 'Ótica Nascimento', nomeCliente: 'Ana Beatriz', produto: null }))
      .toBe('Olá, Ana! Aqui é da Ótica Nascimento. Vi seu interesse no nosso catálogo. Posso te ajudar?')
  })

  it('valida formulários', () => {
    expect(validarInteresse('Ana', '81998765432', true)).toEqual({})
    expect(Object.keys(validarInteresse('', '123', false)).sort()).toEqual(['aceite', 'nome', 'whatsapp'])
    expect(validarConfigCatalogo({ slug: 'otica-nascimento', whatsapp: '', ativo: false })).toEqual({})
    expect(validarConfigCatalogo({ slug: 'otica-nascimento', whatsapp: '', ativo: true }).whatsapp).toBeTruthy()
  })
})
