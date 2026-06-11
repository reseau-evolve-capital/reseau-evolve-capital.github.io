import { describe, expect, it } from 'vitest'

import type { EvolutionPeriod } from '@evolve/ui'

import {
  DEMO_CLUB_PORTFOLIO,
  getDemoEvolutionSeries,
  getDemoVariation1d,
} from './dashboard-chart-demo'

const ANCHOR = '2026-06-10T08:00:00.000Z'
const FINAL = 65574.87
const PERIODS: EvolutionPeriod[] = ['7d', '30d', '90d', '1y', 'max']

describe('getDemoEvolutionSeries', () => {
  it('est déterministe : deux appels identiques → égalité profonde (toutes périodes)', () => {
    for (const period of PERIODS) {
      expect(getDemoEvolutionSeries(period, ANCHOR, FINAL)).toEqual(
        getDemoEvolutionSeries(period, ANCHOR, FINAL)
      )
    }
  })

  it('30J → exactement 30 points (et 7J → 7, 90J → 90)', () => {
    expect(getDemoEvolutionSeries('30d', ANCHOR, FINAL).points).toHaveLength(30)
    expect(getDemoEvolutionSeries('7d', ANCHOR, FINAL).points).toHaveLength(7)
    expect(getDemoEvolutionSeries('90d', ANCHOR, FINAL).points).toHaveLength(90)
  })

  it('le dernier point VAUT finalValue (toutes périodes) et porte la date d’anchor', () => {
    for (const period of PERIODS) {
      const { points } = getDemoEvolutionSeries(period, ANCHOR, FINAL)
      const last = points[points.length - 1]
      expect(last?.value).toBe(FINAL)
      expect(last?.date).toBe('2026-06-10')
    }
  })

  it('7J est la queue des 30J (tranches cohérentes de la même marche seedée)', () => {
    const month = getDemoEvolutionSeries('30d', ANCHOR, FINAL).points
    const week = getDemoEvolutionSeries('7d', ANCHOR, FINAL).points
    expect(week).toEqual(month.slice(-7))
  })

  it('MAX démarre en 2018 (série mensuelle depuis 2018-01)', () => {
    const { points } = getDemoEvolutionSeries('max', ANCHOR, FINAL)
    expect(points[0]?.date).toBe('2018-01-01')
    expect(points.length).toBeGreaterThan(24)
  })

  it('deltaPct 30J ≈ 4,55 (±1) et deltaEur cohérent avec les points', () => {
    const series = getDemoEvolutionSeries('30d', ANCHOR, FINAL)
    expect(series.deltaPct).toBeGreaterThanOrEqual(3.55)
    expect(series.deltaPct).toBeLessThanOrEqual(5.55)
    const first = series.points[0]?.value ?? 0
    expect(series.deltaEur).toBe(Math.round(FINAL - first))
    expect(series.deltaEur).toBeGreaterThan(0)
  })

  it('deltaPct MAX ≈ +178 (croissance depuis l’adhésion)', () => {
    const series = getDemoEvolutionSeries('max', ANCHOR, FINAL)
    expect(series.deltaPct).toBeGreaterThanOrEqual(170)
    expect(series.deltaPct).toBeLessThanOrEqual(186)
  })

  it('aucune valeur NaN ni négative (toutes périodes, y compris deltas)', () => {
    for (const period of PERIODS) {
      const series = getDemoEvolutionSeries(period, ANCHOR, FINAL)
      for (const point of series.points) {
        expect(Number.isFinite(point.value)).toBe(true)
        expect(point.value).toBeGreaterThanOrEqual(0)
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
      expect(Number.isFinite(series.deltaEur)).toBe(true)
      expect(Number.isFinite(series.deltaPct)).toBe(true)
    }
  })

  it('reste sain avec des entrées dégradées (finalValue 0/NaN, anchor invalide)', () => {
    for (const series of [
      getDemoEvolutionSeries('30d', ANCHOR, 0),
      getDemoEvolutionSeries('30d', ANCHOR, Number.NaN),
      getDemoEvolutionSeries('max', 'pas-une-date', FINAL),
    ]) {
      for (const point of series.points) {
        expect(Number.isFinite(point.value)).toBe(true)
        expect(point.value).toBeGreaterThanOrEqual(0)
      }
      expect(Number.isFinite(series.deltaPct)).toBe(true)
    }
  })
})

describe('getDemoVariation1d', () => {
  it('est déterministe et ≈ +1,2 % / +773 € à l’échelle', () => {
    const a = getDemoVariation1d(ANCHOR, FINAL)
    const b = getDemoVariation1d(ANCHOR, FINAL)
    expect(a).toEqual(b)
    expect(a.percent).toBeGreaterThanOrEqual(0.9)
    expect(a.percent).toBeLessThanOrEqual(1.5)
    expect(a.amount).toBeGreaterThan(0)
    // Cohérence interne : amount ≈ finalValue × percent / (100 + percent)
    expect(a.amount).toBe(Math.round(FINAL - FINAL / (1 + a.percent / 100)))
  })

  it('reste sain avec finalValue invalide (0 € de variation, jamais NaN)', () => {
    const v = getDemoVariation1d(ANCHOR, Number.NaN)
    expect(v.amount).toBe(0)
    expect(Number.isFinite(v.percent)).toBe(true)
  })
})

describe('DEMO_CLUB_PORTFOLIO', () => {
  it('expose la valorisation demo du club et sa variation 1j', () => {
    expect(DEMO_CLUB_PORTFOLIO.totalValuation).toBe(708408)
    expect(DEMO_CLUB_PORTFOLIO.variation1dPercent).toBe(0.8)
  })
})
