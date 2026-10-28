// Aparência: preferências pessoais salvas no navegador (modo escuro, contornos, tema).
// O CSS do tema também fica salvo para o script do index.html aplicar antes de pintar a tela.
import { TEMAS, temaCss, temaEhPadrao, temaValido, corContorno, CONTORNO_PADRAO, type Tema } from '../domain/temas'

export const CHAVES = { tema: 'go_tema', temaCss: 'go_tema_css', meus: 'go_temas_meus', modo: 'go_modo', contorno: 'go_contorno' }

const ler = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const gravar = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { /* sem armazenamento */ } }

export function escuroAtivo(): boolean {
  const m = document.documentElement.getAttribute('data-theme')
  if (m) return m === 'dark'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function definirModoEscuro(escuro: boolean) {
  const m = escuro ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', m)
  gravar(CHAVES.modo, m)
  aplicarContorno(contornoSalvo())
}

export function contornoSalvo(): number {
  const v = Number(ler(CHAVES.contorno))
  return ler(CHAVES.contorno) !== null && Number.isFinite(v) ? v : CONTORNO_PADRAO
}
export function aplicarContorno(pct: number, persistir = false) {
  const cor = corContorno(pct, escuroAtivo())
  if (cor) document.documentElement.style.setProperty('--borda', cor)
  else document.documentElement.style.removeProperty('--borda')
  if (persistir) gravar(CHAVES.contorno, pct === CONTORNO_PADRAO ? null : String(pct))
}

export function temaSalvo(): Tema {
  try { const j = JSON.parse(ler(CHAVES.tema) || 'null'); if (temaValido(j)) return j } catch { /* tema inválido */ }
  return { ...TEMAS[0] }
}

export function aplicarTema(p: Tema, persistir = false) {
  let el = document.getElementById('tema-usuario')
  if (temaEhPadrao(p)) el?.remove()
  else {
    if (!el) { el = document.createElement('style'); el.id = 'tema-usuario'; document.head.appendChild(el) }
    el.textContent = temaCss(p)
  }
  if (persistir) {
    if (temaEhPadrao(p)) { gravar(CHAVES.tema, null); gravar(CHAVES.temaCss, null) }
    else { gravar(CHAVES.tema, JSON.stringify(p)); gravar(CHAVES.temaCss, temaCss(p)) }
  }
}

export function temasMeus(): Tema[] {
  try { const j = JSON.parse(ler(CHAVES.meus) || '[]'); return Array.isArray(j) ? j.filter(temaValido) : [] } catch { return [] }
}
export function guardarTemasMeus(lista: Tema[]): boolean {
  try { localStorage.setItem(CHAVES.meus, JSON.stringify(lista)); return true } catch { return false }
}

/** o <style> salvo já entrou pelo index.html; aqui só garante que fica por último no <head> */
export function iniciarAparencia() {
  aplicarTema(temaSalvo())
  aplicarContorno(contornoSalvo())
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => aplicarContorno(contornoSalvo()))
}
