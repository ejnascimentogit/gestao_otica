// Regras de usuários e senhas.

/** Senha do sistema: 8+ caracteres, com letra e número, e não pode ser uma sequência óbvia. */
export function validarNovaSenha(senha: string, confirmacao?: string): string | null {
  if (senha.length < 8) return 'Use pelo menos 8 caracteres.'
  if (!/[A-Za-zÀ-ÿ]/.test(senha) || !/\d/.test(senha)) return 'Misture letras e números.'
  if (/^(\d)\1+$/.test(senha) || ['12345678', '123456789', '87654321', 'senha123', 'password1'].includes(senha.toLowerCase())) {
    return 'Essa senha é fácil de adivinhar.'
  }
  if (confirmacao !== undefined && senha !== confirmacao) return 'As duas senhas não são iguais.'
  return null
}

/** Senha provisória (redefinição pelo gerente): só exige 8+ caracteres, porque a pessoa troca no primeiro acesso. */
export const validarSenhaProvisoria = (senha: string): string | null =>
  senha.length < 8 ? 'A senha provisória precisa ter pelo menos 8 caracteres.' : null

export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

/** Gera uma senha provisória legível, sem caracteres que se confundem (0/O, 1/l). */
export function gerarSenhaProvisoria(aleatorio: () => number = Math.random): string {
  const letras = 'abcdefghjkmnpqrstuvwxyz'
  const numeros = '23456789'
  const l = () => letras[Math.floor(aleatorio() * letras.length)]
  const n = () => numeros[Math.floor(aleatorio() * numeros.length)]
  return `${l()}${l()}${l()}${l()}${n()}${n()}${n()}${n()}`
}
