// Painel "o que fazer hoje": números de ação, lista do que resolver e situação por laboratório.
// Regras puras (sem React). Datas em ISO 'AAAA-MM-DD'; dinheiro em centavos.

export type StatusOsPainel = 'orcamento' | 'aberta' | 'em_laboratorio' | 'aguardando_retirada' | 'finalizada' | 'cancelada'

export interface OsPainel { id: string; numero: number; clienteId: string; laboratorioId: string | null; status: StatusOsPainel; dataOs: string; previsao: string | null }
export interface ParcelaPainel { id: string; osNumero: number; clienteId: string; numero: number; vencimento: string; valorCentavos: number; pago: boolean }
export interface LabPainel { id: string; nome: string; prazoDias: number; ativo: boolean }

export type TipoPendencia = 'os_atrasada' | 'parcela_vencida' | 'pronta' | 'proxima'
export interface Pendencia {
  tipo: TipoPendencia
  id: string
  clienteId: string
  osNumero: number
  /** OS atrasada / parcela: dias de atraso. Próxima: dias até a entrega (0 = hoje). Pronta: 0. */
  dias: number
  data: string | null
  laboratorioId?: string | null
  parcelaNumero?: number
  valorCentavos?: number
}

export interface SituacaoLab {
  lab: LabPainel
  noLab: number
  noPrazo: number
  venceLogo: number
  atrasadas: number
  /** parte das OS no laboratório que está com este laboratório (0–100) */
  pct: number
  noMes: number
  noAno: number
}

export const ETAPAS_ABERTAS: StatusOsPainel[] = ['orcamento', 'aberta', 'em_laboratorio', 'aguardando_retirada']
const EM_PRODUCAO: StatusOsPainel[] = ['aberta', 'em_laboratorio']

const dia = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
export const diasEntre = (de: string, ate: string) => Math.round((dia(ate) - dia(de)) / 86400000)

/** Sábado da semana de `hoje` (semana de domingo a sábado). */
export function sabadoDaSemana(hoje: string): string {
  const d = new Date(dia(hoje))
  d.setUTCDate(d.getUTCDate() + (6 - d.getUTCDay()))
  return d.toISOString().slice(0, 10)
}

export function resumoPainel(ordens: OsPainel[], parcelas: ParcelaPainel[], labs: LabPainel[], hoje: string) {
  const sabado = sabadoDaSemana(hoje)
  const producao = ordens.filter(o => EM_PRODUCAO.includes(o.status))
  const atrasadas = producao.filter(o => o.previsao && o.previsao < hoje)
  const daSemana = producao.filter(o => o.previsao && o.previsao >= hoje && o.previsao <= sabado)
  const vencidas = parcelas.filter(p => !p.pago && p.vencimento < hoje)

  const etapas = ETAPAS_ABERTAS.map(status => ({ status, n: ordens.filter(o => o.status === status).length }))

  const pendencias: Pendencia[] = [
    ...atrasadas.map(o => ({ tipo: 'os_atrasada' as const, id: o.id, clienteId: o.clienteId, osNumero: o.numero, dias: diasEntre(o.previsao!, hoje), data: o.previsao, laboratorioId: o.laboratorioId })),
    ...vencidas.map(p => ({ tipo: 'parcela_vencida' as const, id: p.id, clienteId: p.clienteId, osNumero: p.osNumero, dias: diasEntre(p.vencimento, hoje), data: p.vencimento, parcelaNumero: p.numero, valorCentavos: p.valorCentavos })),
    ...ordens.filter(o => o.status === 'aguardando_retirada').map(o => ({ tipo: 'pronta' as const, id: o.id, clienteId: o.clienteId, osNumero: o.numero, dias: 0, data: o.previsao, laboratorioId: o.laboratorioId })),
    ...producao.filter(o => o.previsao && o.previsao >= hoje && diasEntre(hoje, o.previsao) <= 1)
      .map(o => ({ tipo: 'proxima' as const, id: o.id, clienteId: o.clienteId, osNumero: o.numero, dias: diasEntre(hoje, o.previsao!), data: o.previsao, laboratorioId: o.laboratorioId })),
  ]
  const ordem: Record<TipoPendencia, number> = { os_atrasada: 0, parcela_vencida: 1, pronta: 2, proxima: 3 }
  pendencias.sort((a, b) => ordem[a.tipo] - ordem[b.tipo] || (a.tipo === 'pronta' || a.tipo === 'proxima'
    ? (a.data ?? '').localeCompare(b.data ?? '') : b.dias - a.dias))

  const noLabTotal = ordens.filter(o => o.status === 'em_laboratorio' && o.laboratorioId).length
  const mes = hoje.slice(0, 7), ano = hoje.slice(0, 4)
  const laboratorios: SituacaoLab[] = labs
    .map(lab => {
      const doLab = ordens.filter(o => o.laboratorioId === lab.id && o.status !== 'cancelada' && o.status !== 'orcamento')
      const noLab = doLab.filter(o => o.status === 'em_laboratorio')
      const atr = noLab.filter(o => o.previsao && o.previsao < hoje).length
      const logo = noLab.filter(o => o.previsao && o.previsao >= hoje && diasEntre(hoje, o.previsao) <= 2).length
      return {
        lab, noLab: noLab.length, atrasadas: atr, venceLogo: logo, noPrazo: noLab.length - atr - logo,
        pct: noLabTotal ? Math.round((noLab.length / noLabTotal) * 100) : 0,
        noMes: doLab.filter(o => o.dataOs.startsWith(mes)).length,
        noAno: doLab.filter(o => o.dataOs.startsWith(ano)).length,
      }
    })
    .filter(s => s.lab.ativo || s.noLab > 0)
    .sort((a, b) => b.noLab - a.noLab || a.lab.nome.localeCompare(b.lab.nome))

  return {
    atrasadas: atrasadas.length,
    entregasSemana: daSemana.length,
    parcelasVencidas: vencidas.length,
    valorVencido: vencidas.reduce((s, p) => s + p.valorCentavos, 0),
    etapas,
    pendencias,
    laboratorios,
  }
}

/** Iniciais para o avatar redondo: "Mariana Souza" → "MS". */
export function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(x => x.length > 2 || /^[A-ZÀ-Ú]/.test(x))
  if (!p.length) return '?'
  return ((p[0][0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}
