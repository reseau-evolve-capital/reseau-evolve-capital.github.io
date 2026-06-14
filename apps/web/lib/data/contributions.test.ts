import { describe, it, expect } from 'vitest'
import {
  deriveVariant,
  buildMonthTooltip,
  buildMonthAriaLabel,
  buildTimelineYears,
  type MonthInput,
} from './contributions'

// Helper : indice ordinal (year*12 + month-1) pour piloter nowYM/joinedAtYM dans les tests.
const ym = (year: number, month: number) => year * 12 + (month - 1)
// nowYM très haut → aucun mois de test ne bascule en `future` (sauf cas dédiés).
const FAR_FUTURE = ym(2099, 12)

describe('deriveVariant — dérivation contextuelle (adhésion + mois courant)', () => {
  const base: Omit<MonthInput, 'year' | 'month'> = { amount: 100, status: 'paid', paidAt: null }

  it('mois antérieur à joinedAt → not_applicable (jamais late/rouge)', () => {
    const joinedAtYM = ym(2024, 6)
    // Mois de janvier 2024 (avant juin 2024), même si le statut DB est `late`.
    const m: MonthInput = { ...base, year: 2024, month: 1, status: 'late' }
    expect(deriveVariant(m, joinedAtYM, FAR_FUTURE)).toBe('not_applicable')
  })

  it('AUCUN mois pré-adhésion n’est rendu en late', () => {
    const joinedAtYM = ym(2024, 6)
    for (let month = 1; month <= 5; month++) {
      const m: MonthInput = { ...base, year: 2024, month, status: 'late' }
      expect(deriveVariant(m, joinedAtYM, FAR_FUTURE)).not.toBe('late')
    }
  })

  it('mois strictement futur (année courante) → future', () => {
    const nowYM = ym(2026, 6) // juin 2026
    const m: MonthInput = { ...base, year: 2026, month: 9, status: 'due' }
    expect(deriveVariant(m, null, nowYM)).toBe('future')
  })

  it('mois courant `due` → pending (pas future)', () => {
    const nowYM = ym(2026, 6)
    const m: MonthInput = { ...base, year: 2026, month: 6, status: 'due' }
    expect(deriveVariant(m, null, nowYM)).toBe('pending')
  })

  it('mois passé `late` → late', () => {
    const nowYM = ym(2026, 6)
    const m: MonthInput = { ...base, year: 2026, month: 3, status: 'late' }
    expect(deriveVariant(m, null, nowYM)).toBe('late')
  })

  it('paid→paid, due→pending', () => {
    const nowYM = ym(2026, 6)
    expect(deriveVariant({ ...base, year: 2026, month: 3, status: 'paid' }, null, nowYM)).toBe(
      'paid'
    )
    expect(deriveVariant({ ...base, year: 2026, month: 5, status: 'due' }, null, nowYM)).toBe(
      'pending'
    )
  })

  it('exempt → not_applicable (n’apparaît plus jamais)', () => {
    const nowYM = ym(2026, 6)
    const m: MonthInput = { ...base, year: 2025, month: 7, status: 'exempt' }
    expect(deriveVariant(m, null, nowYM)).toBe('not_applicable')
  })
})

describe('buildMonthTooltip — piloté par la variante dérivée (défauts FR)', () => {
  it('payé avec date → montant FR + date', () => {
    const m: MonthInput = {
      year: 2025,
      month: 3,
      amount: 100,
      status: 'paid',
      paidAt: '2025-03-15',
    }
    const t = buildMonthTooltip(m, 'paid')
    expect(t).toContain('Mars 2025')
    expect(t).toContain('payés')
    expect(t).toContain('€')
    expect(t).toContain(' le ')
  })
  it('paid sans paidAt → payés mais pas " le "', () => {
    const m: MonthInput = { year: 2025, month: 4, amount: 50, status: 'paid', paidAt: null }
    const t = buildMonthTooltip(m, 'paid')
    expect(t).toContain('payés')
    expect(t).not.toContain(' le ')
  })
  it('late avec montant → à régler + montant', () => {
    const m: MonthInput = { year: 2025, month: 11, amount: 100, status: 'late', paidAt: null }
    const t = buildMonthTooltip(m, 'late')
    expect(t).toContain('à régler')
    expect(t).toContain('€')
  })
  it('late sans montant → libellé sans montant', () => {
    const m: MonthInput = { year: 2025, month: 11, amount: 0, status: 'late', paidAt: null }
    const t = buildMonthTooltip(m, 'late')
    expect(t).toContain('cotisation à régler')
  })
  it('pending → en cours', () => {
    const m: MonthInput = { year: 2025, month: 6, amount: 100, status: 'due', paidAt: null }
    expect(buildMonthTooltip(m, 'pending')).toContain('en cours')
  })
  it('future → à venir', () => {
    const m: MonthInput = { year: 2026, month: 9, amount: 100, status: 'due', paidAt: null }
    expect(buildMonthTooltip(m, 'future')).toContain('à venir')
  })
  it('not_applicable → avant ton arrivée', () => {
    const m: MonthInput = { year: 2020, month: 1, amount: 0, status: 'late', paidAt: null }
    expect(buildMonthTooltip(m, 'not_applicable')).toContain('avant ton arrivée')
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
    const a = buildMonthAriaLabel(m, 'paid')
    expect(a).toContain('Mars 2025')
    expect(a).toContain('payés')
  })
  it('late → en retard', () => {
    const m: MonthInput = { year: 2025, month: 5, amount: 100, status: 'late', paidAt: null }
    expect(buildMonthAriaLabel(m, 'late')).toContain('en retard')
  })
  it('future → à venir', () => {
    const m: MonthInput = { year: 2026, month: 9, amount: 100, status: 'due', paidAt: null }
    expect(buildMonthAriaLabel(m, 'future')).toContain('à venir')
  })
  it('not_applicable → avant ton arrivée', () => {
    const m: MonthInput = { year: 2020, month: 1, amount: 0, status: 'late', paidAt: null }
    expect(buildMonthAriaLabel(m, 'not_applicable')).toContain('avant ton arrivée')
  })
  it('pending → en cours', () => {
    const m: MonthInput = { year: 2025, month: 7, amount: 100, status: 'due', paidAt: null }
    expect(buildMonthAriaLabel(m, 'pending')).toContain('en cours')
  })
})

describe('buildTimelineYears — groupement + tri + variantes contextuelles', () => {
  const months: MonthInput[] = [
    { year: 2025, month: 11, amount: 100, status: 'paid', paidAt: '2025-11-05' },
    { year: 2026, month: 1, amount: 100, status: 'paid', paidAt: '2026-01-05' },
    { year: 2025, month: 12, amount: 100, status: 'late', paidAt: null },
    { year: 2026, month: 3, amount: 100, status: 'due', paidAt: null },
  ]
  it('années décroissantes (2026 avant 2025)', () => {
    const years = buildTimelineYears(months, null, FAR_FUTURE)
    expect(years.map((y) => y.year)).toEqual([2026, 2025])
  })
  it('mois décroissants au sein de chaque année', () => {
    const years = buildTimelineYears(months, null, FAR_FUTURE)
    expect(years[0]!.months.map((m) => m.month)).toEqual([3, 1])
    expect(years[1]!.months.map((m) => m.month)).toEqual([12, 11])
  })
  it('variante mappée par cellule (late passé conservé)', () => {
    const years = buildTimelineYears(months, null, FAR_FUTURE)
    // 2025/12 = late, à condition d'être après l'adhésion et passé (FAR_FUTURE → pas future).
    expect(years[1]!.months[0]!.variant).toBe('late')
  })
  it('mois pré-adhésion → not_applicable (pas late)', () => {
    const joinedAtYM = ym(2026, 1) // adhésion janvier 2026
    const years = buildTimelineYears(months, joinedAtYM, FAR_FUTURE)
    const y2025 = years.find((y) => y.year === 2025)!
    // 2025/12 (late en DB) est AVANT janvier 2026 → not_applicable, jamais late.
    expect(y2025.months.every((m) => m.variant !== 'late')).toBe(true)
    expect(y2025.months[0]!.variant).toBe('not_applicable')
  })
  it('mois futur de l’année courante → future', () => {
    const nowYM = ym(2026, 2) // février 2026 → mars 2026 est futur
    const years = buildTimelineYears(months, null, nowYM)
    const y2026 = years.find((y) => y.year === 2026)!
    const march = y2026.months.find((m) => m.month === 3)!
    expect(march.variant).toBe('future')
  })
  it('liste vide → []', () => {
    expect(buildTimelineYears([], null, FAR_FUTURE)).toEqual([])
  })
})
