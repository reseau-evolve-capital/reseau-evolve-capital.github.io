import { describe, it, expect } from 'vitest'
import { mapReportingRows } from '../reporting.mapper.ts'
import type { ReportingRowDTO } from '../../../types/sheets.ts'

const CLUB = '11111111-1111-1111-1111-111111111111'
const SYNCED_AT = '2026-06-12T08:00:00.000Z'

/** Fixture complète : ligne quotidienne valide (tous champs présents). */
function makeRow(overrides: Partial<ReportingRowDTO> = {}): ReportingRowDTO {
  return {
    reportDateRaw: 'dimanche, 03/05/2026',
    portfolioValue: 697286.83,
    totalContributions: 311301.24,
    capitalGain: 385985.59,
    performanceRatio: 2.24,
    ...overrides,
  }
}

describe('mapReportingRows', () => {
  it('mappe la date FR avec jour de semaine vers ISO yyyy-mm-dd', () => {
    const { upserts, skipped } = mapReportingRows([makeRow()], CLUB, SYNCED_AT)
    expect(skipped).toHaveLength(0)
    expect(upserts).toHaveLength(1)
    expect(upserts[0]!.report_date).toBe('2026-05-03')
    expect(upserts[0]!.portfolio_value).toBe(697286.83)
    expect(upserts[0]!.total_contributions).toBe(311301.24)
    // D/E fournis par la feuille → conservés tels quels (la source fait foi).
    expect(upserts[0]!.capital_gain).toBe(385985.59)
    expect(upserts[0]!.performance_ratio).toBe(2.24)
  })

  it('propage club_id et synced_at sur chaque upsert', () => {
    const { upserts } = mapReportingRows([makeRow()], CLUB, SYNCED_AT)
    expect(upserts[0]!.club_id).toBe(CLUB)
    expect(upserts[0]!.synced_at).toBe(SYNCED_AT)
  })

  it('recalcule la plus-value (D = B − C) quand la colonne D est vide', () => {
    const { upserts } = mapReportingRows([makeRow({ capitalGain: null })], CLUB, SYNCED_AT)
    expect(upserts[0]!.capital_gain).toBeCloseTo(385985.59, 2)
  })

  it('recalcule le ratio de performance (E = B / C) quand E est vide et C > 0', () => {
    const { upserts } = mapReportingRows([makeRow({ performanceRatio: null })], CLUB, SYNCED_AT)
    expect(upserts[0]!.performance_ratio).toBeCloseTo(697286.83 / 311301.24, 6)
  })

  it('garde E null quand E est vide et C = 0 (ratio sans sens)', () => {
    const { upserts, skipped } = mapReportingRows(
      [makeRow({ totalContributions: 0, capitalGain: null, performanceRatio: null })],
      CLUB,
      SYNCED_AT
    )
    // C = 0 est VALIDE (début de série) : pas de quarantaine, mais ratio null.
    expect(skipped).toHaveLength(0)
    expect(upserts).toHaveLength(1)
    expect(upserts[0]!.performance_ratio).toBeNull()
    // La plus-value, elle, reste calculable (B − 0).
    expect(upserts[0]!.capital_gain).toBeCloseTo(697286.83, 2)
  })

  it('met en quarantaine MOLLE une date illisible (raison lisible)', () => {
    const { upserts, skipped } = mapReportingRows(
      [makeRow({ reportDateRaw: 'pas une date' }), makeRow({ reportDateRaw: null })],
      CLUB,
      SYNCED_AT
    )
    expect(upserts).toHaveLength(0)
    expect(skipped).toHaveLength(2)
    expect(skipped[0]).toContain('date illisible')
    expect(skipped[0]).toContain('pas une date')
  })

  it('met en quarantaine MOLLE une ligne à B ou C manquant', () => {
    const { upserts, skipped } = mapReportingRows(
      [makeRow({ portfolioValue: null }), makeRow({ totalContributions: null })],
      CLUB,
      SYNCED_AT
    )
    expect(upserts).toHaveLength(0)
    expect(skipped).toHaveLength(2)
    // La raison porte la date ISO (lisible/actionnable côté warning de sync).
    expect(skipped[0]).toContain('2026-05-03')
  })

  it('met en quarantaine MOLLE une ligne à B ou C négatif', () => {
    const { upserts, skipped } = mapReportingRows(
      [makeRow({ portfolioValue: -1 }), makeRow({ totalContributions: -0.01 })],
      CLUB,
      SYNCED_AT
    )
    expect(upserts).toHaveLength(0)
    expect(skipped).toHaveLength(2)
  })

  it('doublons de date : la DERNIÈRE ligne de la feuille gagne', () => {
    const { upserts } = mapReportingRows(
      [
        makeRow({ portfolioValue: 100, totalContributions: 50 }),
        makeRow({ portfolioValue: 200, totalContributions: 80, capitalGain: null }),
      ],
      CLUB,
      SYNCED_AT
    )
    expect(upserts).toHaveLength(1)
    expect(upserts[0]!.report_date).toBe('2026-05-03')
    expect(upserts[0]!.portfolio_value).toBe(200)
    expect(upserts[0]!.total_contributions).toBe(80)
    expect(upserts[0]!.capital_gain).toBe(120)
  })

  it('feuille vide → aucun upsert, aucune quarantaine', () => {
    const { upserts, skipped } = mapReportingRows([], CLUB, SYNCED_AT)
    expect(upserts).toHaveLength(0)
    expect(skipped).toHaveLength(0)
  })
})
