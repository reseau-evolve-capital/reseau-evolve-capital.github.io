import { describe, it, expect } from 'vitest'
import {
  monthVariant,
  buildMonthTooltip,
  buildMonthAriaLabel,
  buildTimelineYears,
  type MonthInput,
} from './contributions'

describe('monthVariant — mapping statut DB → variante visuelle', () => {
  it('paid→paid, due→pending, late→late, exempt→exempt', () => {
    expect(monthVariant('paid')).toBe('paid')
    expect(monthVariant('due')).toBe('pending')
    expect(monthVariant('late')).toBe('late')
    expect(monthVariant('exempt')).toBe('exempt')
  })
})

describe('buildMonthTooltip', () => {
  it('payé avec date → montant FR + date', () => {
    const m: MonthInput = {
      year: 2025,
      month: 3,
      amount: 100,
      status: 'paid',
      paidAt: '2025-03-15',
    }
    const t = buildMonthTooltip(m)
    expect(t).toContain('Mars 2025')
    expect(t).toContain('payé')
    expect(t).toContain('€')
  })
  it('en retard → mention retard', () => {
    const m: MonthInput = { year: 2025, month: 11, amount: 100, status: 'late', paidAt: null }
    expect(buildMonthTooltip(m)).toContain('en retard')
  })
  it('exempté', () => {
    const m: MonthInput = { year: 2024, month: 7, amount: 0, status: 'exempt', paidAt: null }
    expect(buildMonthTooltip(m)).toContain('exempté')
  })
})

describe("buildMonthAriaLabel — verbeux pour lecteur d'écran", () => {
  it('payé inclut le montant', () => {
    const m: MonthInput = {
      year: 2025,
      month: 3,
      amount: 100,
      status: 'paid',
      paidAt: '2025-03-15',
    }
    const a = buildMonthAriaLabel(m)
    expect(a).toContain('Mars 2025')
    expect(a).toContain('payé')
  })
})

describe('buildTimelineYears — groupement + tri', () => {
  const months: MonthInput[] = [
    { year: 2025, month: 11, amount: 100, status: 'paid', paidAt: '2025-11-05' },
    { year: 2026, month: 1, amount: 100, status: 'paid', paidAt: '2026-01-05' },
    { year: 2025, month: 12, amount: 100, status: 'late', paidAt: null },
    { year: 2026, month: 3, amount: 100, status: 'due', paidAt: null },
  ]
  it('années décroissantes (2026 avant 2025)', () => {
    const years = buildTimelineYears(months)
    expect(years.map((y) => y.year)).toEqual([2026, 2025])
  })
  it('mois décroissants au sein de chaque année', () => {
    const years = buildTimelineYears(months)
    expect(years[0]!.months.map((m) => m.month)).toEqual([3, 1])
    expect(years[1]!.months.map((m) => m.month)).toEqual([12, 11])
  })
  it('variante mappée par cellule', () => {
    const years = buildTimelineYears(months)
    expect(years[1]!.months[0]!.variant).toBe('late')
  })
  it('liste vide → []', () => {
    expect(buildTimelineYears([])).toEqual([])
  })
})
