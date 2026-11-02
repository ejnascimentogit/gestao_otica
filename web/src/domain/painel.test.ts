import { describe, expect, it } from 'vitest'
import { diasEntre, iniciais, resumoPainel, sabadoDaSemana, type OsPainel, type ParcelaPainel } from './painel'

const os = (n: number, status: OsPainel['status'], previsao: string | null, lab: string | null = 'L1', dataOs = '2026-10-20'): OsPainel =>
  ({ id: 'o' + n, numero: n, clienteId: 'c' + n, laboratorioId: lab, status, dataOs, previsao })

describe('painel', () => {
  it('datas', () => {
    expect(diasEntre('2026-10-28', '2026-11-02')).toBe(5)
    expect(sabadoDaSemana('2026-11-02')).toBe('2026-11-07') // segunda → sábado
    expect(sabadoDaSemana('2026-11-07')).toBe('2026-11-07')
    expect(sabadoDaSemana('2026-11-08')).toBe('2026-11-14') // domingo começa a semana
  })

  it('números de ação, pendências e laboratórios', () => {
    const hoje = '2026-11-02'
    const ordens = [
      os(1, 'em_laboratorio', '2026-10-28'),          // 5 dias de atraso
      os(2, 'aberta', '2026-10-31', null),             // 2 dias de atraso
      os(3, 'em_laboratorio', '2026-11-03'),          // amanhã
      os(4, 'em_laboratorio', '2026-11-10', 'L2'),    // no prazo
      os(5, 'aguardando_retirada', '2026-10-25'),
      os(6, 'orcamento', null, null),
      os(7, 'finalizada', '2026-10-01', 'L1', '2026-01-10'),
      os(8, 'cancelada', '2026-10-01', 'L1', '2026-11-01'),
    ]
    const parcelas: ParcelaPainel[] = [
      { id: 'p1', osNumero: 9, clienteId: 'c9', numero: 3, vencimento: '2026-10-25', valorCentavos: 31000, pago: false },
      { id: 'p2', osNumero: 9, clienteId: 'c9', numero: 2, vencimento: '2026-09-25', valorCentavos: 31000, pago: true },
      { id: 'p3', osNumero: 9, clienteId: 'c9', numero: 4, vencimento: '2026-11-25', valorCentavos: 31000, pago: false },
    ]
    const labs = [{ id: 'L1', nome: 'Visão', prazoDias: 6, ativo: true }, { id: 'L2', nome: 'Certa', prazoDias: 4, ativo: true }, { id: 'L3', nome: 'Velho', prazoDias: 9, ativo: false }]
    const r = resumoPainel(ordens, parcelas, labs, hoje)

    expect(r.atrasadas).toBe(2)
    expect(r.entregasSemana).toBe(1)
    expect(r.parcelasVencidas).toBe(1)
    expect(r.valorVencido).toBe(31000)
    expect(r.etapas.map(e => e.n)).toEqual([1, 1, 3, 1])
    expect(r.pendencias.map(p => `${p.tipo}:${p.osNumero}:${p.dias}`)).toEqual([
      'os_atrasada:1:5', 'os_atrasada:2:2', 'parcela_vencida:9:8', 'pronta:5:0', 'proxima:3:1',
    ])
    expect(r.laboratorios.map(l => l.lab.id)).toEqual(['L1', 'L2']) // inativo sem OS some
    const l1 = r.laboratorios[0]
    expect([l1.noLab, l1.atrasadas, l1.venceLogo, l1.noPrazo, l1.pct]).toEqual([2, 1, 1, 0, 67])
    expect([l1.noMes, l1.noAno]).toEqual([0, 4]) // cancelada não conta
  })

  it('iniciais', () => {
    expect(iniciais('Mariana Souza')).toBe('MS')
    expect(iniciais('José da Silva Pereira')).toBe('JP')
    expect(iniciais('Ana')).toBe('A')
    expect(iniciais('  ')).toBe('?')
  })
})
