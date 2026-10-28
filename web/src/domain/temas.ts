// Temas e cores: matemática de cor pura (sem DOM), usada pelo Estúdio de Temas.
// Mesma proposta do Estúdio de Temas do Taskfull, adaptada às variáveis do Gestão Ótica.
// O tema vira CSS com variáveis para o modo claro e o escuro; o "Clássico" sem ajuste
// não gera CSS nenhum (fica o visual padrão de index.css).

export type Rgb = [number, number, number]
export type Harmonia = 'mono' | 'analoga' | 'split' | 'comp' | 'triade'
export type Clima = 'calmo' | 'energico' | 'serio' | 'acolhedor'

export interface Tema {
  id: string
  nome: string
  clima: (Clima | 'todos')[]
  /** matiz da cor base, 0–359 */
  h: number
  /** intensidade (saturação), 0–100 */
  s: number
  harm: Harmonia
  menu: 'claro' | 'escuro'
  /** cor de destaque fixa (ignora a harmonia) */
  accHex?: string
  especial?: 'contraste'
  desc?: string
  /** ajuste fino: destaque escolhido à mão */
  finoDest?: string
  /** ajuste fino: fundo do modo claro escolhido à mão */
  fundo?: string
}

export const HARMONIAS: Record<Harmonia, { nome: string; off: number; dica: string }> = {
  mono: { nome: 'Uma cor', off: 0, dica: 'Uma só cor em vários tons: calma e coesa. Cuidado para o destaque não se perder no fundo.' },
  analoga: { nome: 'Vizinhas', off: 30, dica: 'Cores vizinhas no círculo (cerca de 30°): harmoniosas e tranquilas, boas para o dia todo.' },
  split: { nome: 'Compl. suave', off: 150, dica: 'A cor base mais um vizinho da oposta: muito contraste, mas mais amigável que a complementar pura.' },
  comp: { nome: 'Complementar', off: 180, dica: 'Cores opostas (180°): contraste máximo. Fica forte; boa para quem quer energia.' },
  triade: { nome: 'Tríade', off: 120, dica: 'Três cores a 120° uma da outra: variada e viva. Deixe uma dominar e as outras apoiarem.' },
}

export const CLIMAS: [Clima | 'todos', string][] = [
  ['todos', 'Todos'], ['calmo', 'Calmo'], ['energico', 'Energético'], ['serio', 'Sério'], ['acolhedor', 'Acolhedor'],
]

export const TEMAS: Tema[] = [
  { id: 'classico', nome: 'Clássico', clima: ['serio'], h: 177, s: 74, harm: 'comp', menu: 'claro', accHex: '#D98A1F', desc: 'O visual de sempre: verde-petróleo e âmbar.' },
  { id: 'nevoa', nome: 'Névoa', clima: ['calmo'], h: 172, s: 40, harm: 'analoga', menu: 'claro', desc: 'Claro e suave, com verde-menta.' },
  { id: 'salvia', nome: 'Sálvia', clima: ['calmo', 'acolhedor'], h: 140, s: 24, harm: 'analoga', menu: 'claro', desc: 'Verdes acinzentados, repousantes.' },
  { id: 'oceano', nome: 'Oceano', clima: ['serio', 'calmo'], h: 214, s: 70, harm: 'mono', menu: 'escuro', desc: 'Azul profundo e confiável.' },
  { id: 'marinho-laranja', nome: 'Marinho e laranja', clima: ['energico'], h: 216, s: 78, harm: 'comp', menu: 'escuro', desc: 'Complementar clássica: azul e laranja.' },
  { id: 'uva-limao', nome: 'Uva e limão', clima: ['energico'], h: 280, s: 62, harm: 'split', menu: 'escuro', desc: 'Roxo com um destaque verde-limão.' },
  { id: 'lavanda', nome: 'Lavanda', clima: ['calmo', 'acolhedor'], h: 255, s: 60, harm: 'mono', menu: 'escuro', desc: 'Violeta suave e moderno.' },
  { id: 'pessego', nome: 'Pêssego', clima: ['acolhedor'], h: 18, s: 62, harm: 'analoga', menu: 'claro', desc: 'Claro e quente, tons de pôr do sol.' },
  { id: 'areia', nome: 'Areia', clima: ['acolhedor', 'calmo'], h: 36, s: 34, harm: 'analoga', menu: 'claro', desc: 'Bege e terracota, aconchegante.' },
  { id: 'grafite', nome: 'Grafite e âmbar', clima: ['serio'], h: 218, s: 14, harm: 'comp', menu: 'escuro', accHex: '#E8BD4F', desc: 'Neutro e sóbrio, com um toque de âmbar.' },
  { id: 'tropical', nome: 'Tropical', clima: ['energico', 'acolhedor'], h: 176, s: 66, harm: 'triade', menu: 'escuro', desc: 'Turquesa com um destaque vibrante.' },
  { id: 'contraste', nome: 'Alto contraste', clima: ['serio'], h: 0, s: 0, harm: 'mono', menu: 'escuro', accHex: '#FFD400', especial: 'contraste', desc: 'Preto, branco e amarelo para leitura máxima.' },
]

// ---------- matemática de cor ----------
const lim = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export function hsl(h: number, s: number, l: number): Rgb {
  h = ((h % 360) + 360) % 360; s = lim(s, 0, 100) / 100; l = lim(l, 0, 100) / 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))) }
  return [f(0), f(8), f(4)]
}
export const hex = (r: Rgb) => '#' + r.map(v => v.toString(16).padStart(2, '0')).join('')
export function rgb(x: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(x.trim())
  if (!m) return [0, 0, 0]
  return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) as Rgb
}
export function matizDe(r: Rgb): number {
  const [R, G, B] = r.map(v => v / 255), mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn
  if (!d) return 0
  const h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4
  return (h * 60 + 360) % 360
}
export function luminancia(r: Rgb): number {
  const c = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  return 0.2126 * c(r[0]) + 0.7152 * c(r[1]) + 0.0722 * c(r[2])
}
/** razão de contraste WCAG (1 a 21) */
export function contraste(a: Rgb, b: Rgb): number {
  const x = luminancia(a), y = luminancia(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
/** mistura: a = 1 → só fg, a = 0 → só bg */
export const misturar = (fg: Rgb, bg: Rgb, a: number): Rgb => fg.map((v, i) => Math.round(v * a + bg[i] * (1 - a))) as Rgb

/** clareia (dir +1) ou escurece (dir −1) até passar de 4,5:1 contra o fundo */
export function garantir(h: number, s: number, l: number, fundo: Rgb, dir: 1 | -1, alvo = 4.5): { cor: Rgb; l: number } {
  let n = 0
  while (contraste(hsl(h, s, l), fundo) < alvo && n++ < 100) l = lim(l + dir, 2, 98)
  return { cor: hsl(h, s, l), l }
}
const melhorTexto = (fundo: Rgb): Rgb => contraste([255, 255, 255], fundo) >= contraste([12, 18, 18], fundo) ? [255, 255, 255] : [12, 18, 18]

// ---------- geração do tema ----------
export interface CoresTema {
  papel: Rgb; superficie: Rgb; superficie2: Rgb; borda: Rgb
  tinta: Rgb; tinta2: Rgb; tinta3: Rgb
  marca: Rgb; marcaForte: Rgb; marcaSuave: Rgb; marcaTinta: Rgb
  acento: Rgb; acentoSuave: Rgb; acentoTinta: Rgb
  lateral: Rgb; lateralTinta: Rgb; lateralForte: Rgb; lateralFraco: Rgb; lateralBorda: Rgb
  lateralHover: string; lateralAtivo: Rgb; lateralAtivoTinta: Rgb
}

export const temaEhPadrao = (p?: Tema | null) => !p || (p.id === 'classico' && !p.finoDest && !p.fundo)

/** cores do visual padrão (index.css), para miniaturas e teste de contraste */
function padrao(escuro: boolean): CoresTema {
  const c = escuro
    ? { papel: '#121817', superficie: '#1a2221', superficie2: '#1f2827', borda: '#2c3735', tinta: '#e8eceb', tinta2: '#a9b4b2', tinta3: '#7d8987', marca: '#4fb3a9', marcaForte: '#7ccdc4', marcaSuave: '#1d3331', marcaTinta: '#0b1a19', acento: '#f0a640', acentoSuave: '#3a2c17', acentoTinta: '#1d1405' }
    : { papel: '#f6f4ef', superficie: '#ffffff', superficie2: '#faf8f4', borda: '#e4dfd5', tinta: '#1d2a2a', tinta2: '#5b6866', tinta3: '#8b9593', marca: '#0e5c58', marcaForte: '#0a4441', marcaSuave: '#e3efed', marcaTinta: '#ffffff', acento: '#d98a1f', acentoSuave: '#fbefdc', acentoTinta: '#1d1405' }
  const t = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, rgb(v)])) as Record<keyof typeof c, Rgb>
  return {
    ...t,
    lateral: t.superficie, lateralTinta: t.tinta2, lateralForte: t.tinta, lateralFraco: t.tinta3, lateralBorda: t.borda,
    lateralHover: hex(t.superficie2), lateralAtivo: t.marcaSuave, lateralAtivoTinta: t.marcaForte,
  }
}

export function matizDestaque(p: Tema): number {
  const base = p.finoDest || p.accHex
  return base ? matizDe(rgb(base)) : p.h + HARMONIAS[p.harm].off
}

export function gerarTema(p: Tema, escuro: boolean): CoresTema {
  if (temaEhPadrao(p)) return padrao(escuro)
  const accBase = p.finoDest || p.accHex || null
  const ha = matizDestaque(p)
  const sm = Math.min(70, p.s * 0.85)

  if (p.especial === 'contraste') {
    const preto: Rgb = escuro ? [0, 0, 0] : [255, 255, 255]
    const branco: Rgb = escuro ? [255, 255, 255] : [0, 0, 0]
    const acento = rgb(accBase || '#FFD400')
    const marca: Rgb = escuro ? acento : [0, 0, 0]
    const t: CoresTema = {
      papel: p.fundo && !escuro ? rgb(p.fundo) : preto, superficie: preto, superficie2: escuro ? [20, 20, 20] : [245, 245, 245],
      borda: escuro ? [150, 150, 150] : [90, 90, 90], tinta: branco, tinta2: escuro ? [225, 225, 225] : [40, 40, 40], tinta3: escuro ? [190, 190, 190] : [70, 70, 70],
      marca, marcaForte: escuro ? [255, 255, 255] : [0, 0, 0], marcaSuave: escuro ? [50, 45, 0] : [255, 244, 170], marcaTinta: melhorTexto(marca),
      acento, acentoSuave: escuro ? [50, 45, 0] : [255, 244, 170], acentoTinta: [0, 0, 0],
      lateral: [0, 0, 0], lateralTinta: [235, 235, 235], lateralForte: [255, 255, 255], lateralFraco: [200, 200, 200], lateralBorda: [120, 120, 120],
      lateralHover: 'rgba(255,255,255,.14)', lateralAtivo: acento, lateralAtivoTinta: [0, 0, 0],
    }
    return t
  }

  const t = {} as CoresTema
  if (!escuro) {
    t.papel = p.fundo ? rgb(p.fundo) : hsl(p.h, Math.min(30, p.s * 0.4 + 6), 96)
    t.superficie = [255, 255, 255]
    t.superficie2 = misturar(t.papel, t.superficie, 0.5)
    t.borda = hsl(p.h, Math.min(22, p.s * 0.3 + 4), 87)
    t.tinta = hsl(p.h, Math.min(32, p.s * 0.5), 12)
    t.tinta2 = garantir(p.h, Math.min(16, p.s * 0.3 + 4), 40, t.papel, -1).cor
    t.tinta3 = hsl(p.h, Math.min(12, p.s * 0.2 + 3), 55)
    const m = garantir(p.h, sm, 32, t.superficie, -1)
    t.marca = m.cor
    t.marcaForte = hsl(p.h, sm, Math.max(6, m.l - 8))
    t.marcaSuave = misturar(t.marca, t.superficie, 0.11)
    t.acento = accBase ? rgb(accBase) : hsl(ha, Math.min(92, p.s + 14), 54)
    t.acentoSuave = misturar(t.acento, t.superficie, 0.16)
  } else {
    t.papel = hsl(p.h, Math.min(16, p.s * 0.2 + 4), 8)
    t.superficie = hsl(p.h, Math.min(14, p.s * 0.18 + 4), 12)
    t.superficie2 = hsl(p.h, Math.min(13, p.s * 0.16 + 4), 14.5)
    t.borda = hsl(p.h, Math.min(12, p.s * 0.15 + 3), 21)
    t.tinta = [232, 236, 235]
    t.tinta2 = garantir(p.h, Math.min(12, p.s * 0.15 + 3), 68, t.superficie, 1).cor
    t.tinta3 = hsl(p.h, Math.min(8, p.s * 0.1 + 2), 54)
    const m = garantir(p.h, Math.min(60, p.s * 0.7 + 10), 56, t.superficie, 1)
    t.marca = m.cor
    t.marcaForte = hsl(p.h, Math.min(60, p.s * 0.7 + 10), Math.min(90, m.l + 12))
    t.marcaSuave = misturar(t.marca, t.superficie, 0.18)
    t.acento = accBase ? rgb(accBase) : hsl(ha, Math.min(92, p.s + 14), 62)
    t.acentoSuave = misturar(t.acento, t.superficie, 0.2)
  }
  t.marcaTinta = melhorTexto(t.marca)
  t.acentoTinta = melhorTexto(t.acento)

  if (p.menu === 'escuro') {
    t.lateral = escuro ? hsl(p.h, Math.min(60, p.s * 0.6), 9) : hsl(p.h, Math.min(70, p.s * 0.75), 17)
    t.lateralTinta = misturar([255, 255, 255], t.lateral, 0.78)
    t.lateralForte = [255, 255, 255]
    t.lateralFraco = misturar([255, 255, 255], t.lateral, 0.58)
    t.lateralBorda = misturar([255, 255, 255], t.lateral, 0.12)
    t.lateralHover = 'rgba(255,255,255,.07)'
    t.lateralAtivo = misturar(t.acento, t.lateral, 0.18)
    t.lateralAtivoTinta = garantir(ha, Math.min(95, p.s + 15), 74, t.lateralAtivo, 1).cor
  } else {
    t.lateral = t.superficie; t.lateralTinta = t.tinta2; t.lateralForte = t.tinta; t.lateralFraco = t.tinta3
    t.lateralBorda = t.borda; t.lateralHover = hex(t.superficie2)
    t.lateralAtivo = t.marcaSuave; t.lateralAtivoTinta = t.marcaForte
  }
  return t
}

function variaveis(t: CoresTema): string {
  const c = hex
  return `--papel:${c(t.papel)};--superficie:${c(t.superficie)};--superficie-2:${c(t.superficie2)};--borda:${c(t.borda)};`
    + `--tinta:${c(t.tinta)};--tinta-2:${c(t.tinta2)};--tinta-3:${c(t.tinta3)};`
    + `--marca:${c(t.marca)};--marca-forte:${c(t.marcaForte)};--marca-suave:${c(t.marcaSuave)};--marca-tinta:${c(t.marcaTinta)};`
    + `--acento:${c(t.acento)};--acento-suave:${c(t.acentoSuave)};--acento-tinta:${c(t.acentoTinta)};`
    + `--lateral-fundo:${c(t.lateral)};--lateral-tinta:${c(t.lateralTinta)};--lateral-forte:${c(t.lateralForte)};--lateral-fraco:${c(t.lateralFraco)};`
    + `--lateral-borda:${c(t.lateralBorda)};--lateral-hover:${t.lateralHover};--lateral-ativo-fundo:${c(t.lateralAtivo)};--lateral-ativo-tinta:${c(t.lateralAtivoTinta)};`
}

/** CSS completo do tema (claro + escuro). "html:root" ganha da especificidade do index.css. */
export function temaCss(p: Tema): string {
  if (temaEhPadrao(p)) return ''
  const L = variaveis(gerarTema(p, false)), D = variaveis(gerarTema(p, true))
  return `@media (prefers-color-scheme: light){html:root:not([data-theme="dark"]){${L}}}html:root[data-theme="light"]{${L}}`
    + `html:root[data-theme="dark"]{${D}}@media (prefers-color-scheme: dark){html:root:not([data-theme="light"]){${D}}}`
}

export interface ParContraste { rotulo: string; frente: Rgb; fundo: Rgb; razao: number; ok: boolean }

/** pares que precisam ser legíveis (WCAG AA: 4,5:1) */
export function testarContraste(p: Tema, escuro: boolean): ParContraste[] {
  const t = gerarTema(p, escuro)
  const pares: [string, Rgb, Rgb][] = [
    ['Texto sobre o fundo', t.tinta, t.papel],
    ['Texto secundário', t.tinta2, t.papel],
    ['Botão principal', t.marcaTinta, t.marca],
    ['Botão de destaque', t.acentoTinta, t.acento],
    ['Link e valor em destaque', t.marca, t.superficie],
    ['Menu: texto', t.lateralTinta, t.lateral],
    ['Menu: item ativo', t.lateralAtivoTinta, t.lateralAtivo],
  ]
  return pares.map(([rotulo, frente, fundo]) => { const razao = contraste(frente, fundo); return { rotulo, frente, fundo, razao, ok: razao >= 4.5 } })
}

/** pontos (graus) da harmonia, para desenhar no círculo */
export function pontosHarmonia(p: Pick<Tema, 'h' | 'harm'>): number[] {
  const g = [p.h]
  if (p.harm === 'triade') g.push(p.h + 120, p.h + 240)
  else if (p.harm === 'split') g.push(p.h + 150, p.h + 210)
  else if (p.harm !== 'mono') g.push(p.h + HARMONIAS[p.harm].off)
  return g.map(x => ((x % 360) + 360) % 360)
}

/** valida um tema vindo do localStorage */
export function temaValido(x: unknown): x is Tema {
  const t = x as Tema
  return !!t && typeof t === 'object' && typeof t.h === 'number' && typeof t.s === 'number' && t.harm in HARMONIAS && (t.menu === 'claro' || t.menu === 'escuro')
}

// ---------- linhas e contornos (slider Suave–Forte) ----------
export const CONTORNO_PADRAO = 30
/** cor da borda para a intensidade 0–100; null = padrão do tema */
export function corContorno(pct: number, escuro: boolean): string | null {
  const p = lim(Math.round(pct), 0, 100)
  if (p === CONTORNO_PADRAO) return null
  const alfa = (0.06 + (p / 100) * 0.34).toFixed(2)
  return escuro ? `rgba(200, 214, 212, ${alfa})` : `rgba(29, 42, 42, ${alfa})`
}
