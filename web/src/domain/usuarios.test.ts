import { emailValido, gerarSenhaProvisoria, validarNovaSenha, validarSenhaProvisoria } from './usuarios'

describe('usuários e senhas', () => {
  test('senha nova', () => {
    expect(validarNovaSenha('curta1')).toMatch(/8 caracteres/)
    expect(validarNovaSenha('somenteletras')).toMatch(/letras e números/)
    expect(validarNovaSenha('12345678')).toMatch(/letras e números|adivinhar/)
    expect(validarNovaSenha('Senha123')).toMatch(/adivinhar/)
    expect(validarNovaSenha('otica2026', 'otica2025')).toMatch(/iguais/)
    expect(validarNovaSenha('otica2026', 'otica2026')).toBeNull()
  })

  test('senha provisória e e-mail', () => {
    expect(validarSenhaProvisoria('1234567')).not.toBeNull()
    expect(validarSenhaProvisoria('12345678')).toBeNull()
    expect(emailValido('ana@otica.com')).toBe(true)
    expect(emailValido('ana@otica')).toBe(false)
  })

  test('gera senha provisória com 8 caracteres e sem 0/O/1/l', () => {
    const s = gerarSenhaProvisoria()
    expect(s).toHaveLength(8)
    expect(s).not.toMatch(/[0O1l]/)
    expect(validarSenhaProvisoria(s)).toBeNull()
  })
})
