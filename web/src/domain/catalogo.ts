// Catálogo da loja: endereço público, números de WhatsApp e mensagens prontas.
// O WhatsApp é aberto pelo link wa.me (clique para conversar): quem envia a mensagem
// é a própria pessoa, no celular dela. O sistema não dispara nada sozinho.
import { formatarMoeda, type Centavos } from './formatos'

/** Número no formato do wa.me (só dígitos, com 55). null se não parecer um celular/telefone do Brasil. */
export function normalizarWhatsapp(txt: string): string | null {
  let d = (txt ?? '').replace(/\D/g, '').replace(/^0+/, '')
  if (d.length === 10 || d.length === 11) d = '55' + d
  if (!/^55\d{10,11}$/.test(d)) return null
  const ddd = Number(d.slice(2, 4))
  if (ddd < 11 || ddd > 99) return null
  return d
}

/** 5581998765432 → (81) 99876-5432 */
export function formatarWhatsapp(n: string | null | undefined): string {
  const d = (n ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return n ?? ''
}

/** "Ótica Nascimento" → "otica-nascimento" */
export function gerarSlug(nome: string): string {
  return (nome ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40).replace(/-+$/, '')
}

export const slugValido = (s: string) => /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(s)

export const urlCatalogo = (origem: string, slug: string) => `${origem.replace(/\/+$/, '')}/catalogo/${slug}`

/** Slug do caminho /catalogo/<slug> (ou null) */
export function slugDoCaminho(caminho: string): string | null {
  const m = /^\/catalogo\/([a-z0-9-]+)\/?$/i.exec(caminho)
  return m ? m[1].toLowerCase() : null
}

/** Link que abre o WhatsApp com a mensagem pronta. Sem número: a pessoa escolhe o contato. */
export function linkWhatsapp(numero: string | null | undefined, texto: string): string {
  const n = numero ? normalizarWhatsapp(numero) : null
  return `https://wa.me/${n ?? ''}?text=${encodeURIComponent(texto)}`
}

const primeiroNome = (nome: string) => (nome ?? '').trim().split(/\s+/)[0] ?? ''

/** Mensagem que o cliente manda para a loja ao clicar no produto */
export function mensagemInteresse(p: { loja: string; nomeCliente: string; produto?: string; preco?: Centavos }): string {
  const quem = primeiroNome(p.nomeCliente)
  const abertura = quem ? `Olá! Sou ${quem}.` : 'Olá!'
  if (!p.produto) return `${abertura} Vi o catálogo da ${p.loja} e quero mais informações.`
  const preco = p.preco ? ` (${formatarMoeda(p.preco).replace(/\s/g, ' ')})` : ''
  return `${abertura} Vi no catálogo da ${p.loja} o modelo *${p.produto}*${preco} e tenho interesse.`
}

/** Mensagem que a loja manda para convidar alguém a ver o catálogo */
export function mensagemConvite(loja: string, link: string, nomeCliente?: string): string {
  const quem = primeiroNome(nomeCliente ?? '')
  return `${quem ? `Olá, ${quem}!` : 'Olá!'} Separamos nossas armações para você ver com calma: ${link}\nGostou de algum modelo? É só tocar em "Tenho interesse" que a gente conversa por aqui. ${loja}`
}

/** Mensagem que a loja manda de volta para quem deixou o contato no catálogo */
export function mensagemRetorno(p: { loja: string; nomeCliente: string; produto?: string | null }): string {
  const quem = primeiroNome(p.nomeCliente)
  const sobre = p.produto ? ` sobre o modelo *${p.produto}*` : ''
  return `Olá, ${quem}! Aqui é da ${p.loja}. Vi seu interesse${sobre} no nosso catálogo. Posso te ajudar?`
}

export type StatusInteressado = 'novo' | 'em_contato' | 'virou_cliente' | 'descartado'
export const STATUS_INTERESSADO: Record<StatusInteressado, { rotulo: string; tom: string }> = {
  novo: { rotulo: 'Novo', tom: 'info' },
  em_contato: { rotulo: 'Em contato', tom: 'alerta' },
  virou_cliente: { rotulo: 'Virou cliente', tom: 'ok' },
  descartado: { rotulo: 'Descartado', tom: 'neutro' },
}

export function validarInteresse(nome: string, whatsapp: string, aceite: boolean): Record<string, string> {
  const e: Record<string, string> = {}
  if ((nome ?? '').trim().length < 2) e.nome = 'Informe seu nome.'
  if (!normalizarWhatsapp(whatsapp)) e.whatsapp = 'WhatsApp com DDD, ex.: (81) 99876-5432.'
  if (!aceite) e.aceite = 'Marque a autorização para a loja falar com você.'
  return e
}

export function validarConfigCatalogo(c: { slug: string; whatsapp: string; ativo: boolean }): Record<string, string> {
  const e: Record<string, string> = {}
  if (!slugValido(c.slug)) e.slug = 'Use de 3 a 40 letras minúsculas, números ou hífen (sem acento).'
  if (c.whatsapp.trim() && !normalizarWhatsapp(c.whatsapp)) e.whatsapp = 'WhatsApp com DDD, ex.: (81) 99876-5432.'
  if (c.ativo && !c.whatsapp.trim()) e.whatsapp = 'Para ligar o catálogo, informe o WhatsApp da loja.'
  return e
}
