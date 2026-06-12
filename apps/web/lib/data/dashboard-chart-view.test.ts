// Tests des helpers PURS de présentation de la série live (DSH-012) :
// slicePeriod (coupe calendaire avec trous week-end), summarize (gardes computeVariation),
// downsample (premier/dernier conservés, déterminisme). Vitest node — aucun mock réseau.

import { describe, it, expect } from 'vitest'

import type { DashboardChartPoint } from './dashboard-chart'

import { slicePeriod, summarize, downsample } from './dashboard-chart-view'

const DAY_MS = 86_400_000

/** Génère `count` points quotidiens CONTIGUS finissant à `endDate` (valeurs 1000+i). */
function makeDailyPoints(endDate: string, count: number): DashboardChartPoint[] {
  const endMs = Date.parse(endDate)
  return Array.from({ length: count }, (_, i) => ({
    date: new Date(endMs - (count - 1 - i) * DAY_MS).toISOString().slice(0, 10),
    value: 1000 + i,
  }))
}

describe('slicePeriod', () => {
  it('coupe au cutoff calendaire « dernière date − N jours » (7d sur série quotidienne)', () => {
    const series = makeDailyPoints('2026-06-10', 60)
    const slice = slicePeriod(series, '7d')
    // Cutoff = 2026-06-03 inclus → 8 points calendaires contigus (03 → 10).
    expect(slice[0]?.date).toBe('2026-06-03')
    expect(slice[slice.length - 1]?.date).toBe('2026-06-10')
    expect(slice).toHaveLength(8)
  })

  it('tolère les trous week-end : garde tout point ≥ cutoff, même clairsemé', () => {
    // Série « jours ouvrés » : trous samedi/dimanche (2026-06-06/07 absents).
    const series: DashboardChartPoint[] = [
      { date: '2026-05-29', value: 100 },
      { date: '2026-06-01', value: 101 },
      { date: '2026-06-02', value: 102 },
      { date: '2026-06-03', value: 103 },
      { date: '2026-06-04', value: 104 },
      { date: '2026-06-05', value: 105 },
      { date: '2026-06-08', value: 106 },
      { date: '2026-06-09', value: 107 },
      { date: '2026-06-10', value: 108 },
    ]
    const slice = slicePeriod(series, '7d')
    // Cutoff = 2026-06-03 → 2026-05-29/06-01/06-02 exclus, les 6 restants gardés (ordre ASC).
    expect(slice.map((p) => p.date)).toEqual([
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
    ])
  })

  it("retourne la série entière pour 'max' (copie, pas la même référence)", () => {
    const series = makeDailyPoints('2026-06-10', 10)
    const slice = slicePeriod(series, 'max')
    expect(slice).toEqual(series)
    expect(slice).not.toBe(series)
  })

  it('historique plus court que la période → tout est gardé (cutoff avant le premier point)', () => {
    const series = makeDailyPoints('2026-06-10', 5)
    expect(slicePeriod(series, '30d')).toEqual(series)
    expect(slicePeriod(series, '1y')).toEqual(series)
  })

  it('série vide → slice vide (toute période)', () => {
    expect(slicePeriod([], '7d')).toEqual([])
    expect(slicePeriod([], 'max')).toEqual([])
  })

  it('bornes 30d/90d/1y : premier point du slice = cutoff exact sur série contiguë', () => {
    const series = makeDailyPoints('2026-06-10', 500)
    expect(slicePeriod(series, '30d')[0]?.date).toBe('2026-05-11')
    expect(slicePeriod(series, '90d')[0]?.date).toBe('2026-03-12')
    expect(slicePeriod(series, '1y')[0]?.date).toBe('2025-06-10')
  })
})

describe('summarize', () => {
  it('delta premier → dernier (EUR + fraction)', () => {
    const slice: DashboardChartPoint[] = [
      { date: '2026-06-01', value: 1000 },
      { date: '2026-06-05', value: 1100 },
    ]
    expect(summarize(slice)).toEqual({ deltaEur: 100, deltaPct: 0.1 })
  })

  it('delta négatif → valeurs négatives (jamais NaN)', () => {
    const slice: DashboardChartPoint[] = [
      { date: '2026-06-01', value: 1000 },
      { date: '2026-06-05', value: 900 },
    ]
    const result = summarize(slice)
    expect(result).toEqual({ deltaEur: -100, deltaPct: -0.1 })
  })

  it('null si slice vide ou 1 seul point', () => {
    expect(summarize([])).toBeNull()
    expect(summarize([{ date: '2026-06-01', value: 1000 }])).toBeNull()
  })

  it('null si base ≤ 0 (un % sur base nulle/négative n’a pas de sens)', () => {
    expect(
      summarize([
        { date: '2026-06-01', value: 0 },
        { date: '2026-06-05', value: 100 },
      ])
    ).toBeNull()
    expect(
      summarize([
        { date: '2026-06-01', value: -50 },
        { date: '2026-06-05', value: 100 },
      ])
    ).toBeNull()
  })
})

describe('downsample', () => {
  it('identité si length ≤ max (référence conservée)', () => {
    const points = makeDailyPoints('2026-06-10', 100)
    expect(downsample(points, 400)).toBe(points)
    expect(downsample(points, 100)).toBe(points)
  })

  it('réduit à ≤ max en conservant premier et dernier points', () => {
    const points = makeDailyPoints('2026-06-10', 2900)
    const sampled = downsample(points)
    expect(sampled.length).toBeLessThanOrEqual(400)
    expect(sampled[0]).toEqual(points[0])
    expect(sampled[sampled.length - 1]).toEqual(points[points.length - 1])
  })

  it("préserve l'ordre ASC (échantillonnage d'index strictement croissant)", () => {
    const points = makeDailyPoints('2026-06-10', 1000)
    const sampled = downsample(points, 50)
    for (let i = 1; i < sampled.length; i++) {
      const prev = sampled[i - 1]
      const curr = sampled[i]
      expect(prev && curr && prev.date < curr.date).toBe(true)
    }
  })

  it('déterministe : deux appels identiques → mêmes points', () => {
    const points = makeDailyPoints('2026-06-10', 777)
    expect(downsample(points, 123)).toEqual(downsample(points, 123))
  })

  it('max < 2 → clamp à 2 (premier + dernier toujours garantis)', () => {
    const points = makeDailyPoints('2026-06-10', 10)
    const sampled = downsample(points, 1)
    expect(sampled).toEqual([points[0], points[9]])
  })
})
