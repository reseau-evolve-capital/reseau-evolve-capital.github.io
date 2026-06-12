import { describe, it, expect } from 'vitest'

import type { createServerClient } from '@evolve/data'

import {
  deriveMemberSeries,
  computeVariation,
  getDashboardChartData,
  type DashboardChartPoint,
} from './dashboard-chart'

type ServerClient = ReturnType<typeof createServerClient>

/** Ligne club synthétique (shape minimal lu par le module). */
type ClubRow = { report_date: string; portfolio_value: number }

/** Génère `count` lignes quotidiennes à partir de `startDate` (valeurs croissantes 1000+i). */
function makeDailyRows(startDate: string, count: number): ClubRow[] {
  const startMs = Date.parse(startDate)
  return Array.from({ length: count }, (_, i) => ({
    report_date: new Date(startMs + i * 86_400_000).toISOString().slice(0, 10),
    portfolio_value: 1000 + i,
  }))
}

/**
 * Faux client Supabase chaînable (zéro réseau), même pattern que dashboard.test.ts mais
 * avec un terminateur `.range(from, to)` qui découpe la fixture — permet de vérifier
 * la pagination PostgREST (plafond 1 000 lignes). Les appels range sont tracés.
 */
function makeSupabaseListMock(
  rows: ClubRow[],
  error: unknown = null,
  rangeCalls: [number, number][] = []
): ServerClient {
  const from = () => {
    const chain: Record<string, unknown> = {}
    chain.select = () => chain
    chain.eq = () => chain
    chain.order = () => chain
    chain.range = (fromIdx: number, toIdx: number) => {
      rangeCalls.push([fromIdx, toIdx])
      return Promise.resolve(
        error ? { data: null, error } : { data: rows.slice(fromIdx, toIdx + 1), error: null }
      )
    }
    return chain
  }
  return { from } as unknown as ServerClient
}

describe('deriveMemberSeries', () => {
  it('multiplie portfolio_value par detentionPct', () => {
    const rows: ClubRow[] = [
      { report_date: '2026-01-01', portfolio_value: 1000 },
      { report_date: '2026-01-02', portfolio_value: 2000 },
    ]
    const series = deriveMemberSeries(rows, 0.1, null)
    expect(series).toEqual([
      { date: '2026-01-01', value: 100 },
      { date: '2026-01-02', value: 200 },
    ])
  })

  it('applique le cutoff joinedAt (report_date >= joinedAt)', () => {
    const rows: ClubRow[] = [
      { report_date: '2018-01-01', portfolio_value: 500 },
      { report_date: '2018-06-01', portfolio_value: 600 },
      { report_date: '2018-09-01', portfolio_value: 700 },
    ]
    const series = deriveMemberSeries(rows, 1, '2018-06-01')
    // Le point du jour d'adhésion est INCLUS (>=), le point antérieur est exclu.
    expect(series.map((p) => p.date)).toEqual(['2018-06-01', '2018-09-01'])
  })

  it('normalise un joinedAt timestamp en cutoff calendaire', () => {
    const rows: ClubRow[] = [
      { report_date: '2018-05-31', portfolio_value: 500 },
      { report_date: '2018-06-01', portfolio_value: 600 },
    ]
    const series = deriveMemberSeries(rows, 1, '2018-06-01T00:00:00Z')
    expect(series.map((p) => p.date)).toEqual(['2018-06-01'])
  })

  it('ignore le cutoff quand joinedAt est null', () => {
    const rows = makeDailyRows('2026-01-01', 3)
    expect(deriveMemberSeries(rows, 1, null)).toHaveLength(3)
  })

  it('ignore le cutoff quand joinedAt est non parseable', () => {
    const rows = makeDailyRows('2026-01-01', 3)
    expect(deriveMemberSeries(rows, 1, 'pas-une-date')).toHaveLength(3)
  })

  it('écarte les points non finis (NaN / Infinity) — jamais de NaN', () => {
    const rows: ClubRow[] = [
      { report_date: '2026-01-01', portfolio_value: 1000 },
      { report_date: '2026-01-02', portfolio_value: NaN },
      { report_date: '2026-01-03', portfolio_value: Infinity },
      { report_date: '2026-01-04', portfolio_value: 2000 },
    ]
    const series = deriveMemberSeries(rows, 0.5, null)
    expect(series.map((p) => p.date)).toEqual(['2026-01-01', '2026-01-04'])
    expect(series.every((p) => Number.isFinite(p.value))).toBe(true)
  })

  it('écarte les points dont la date est non parseable', () => {
    const rows: ClubRow[] = [
      { report_date: 'n/a', portfolio_value: 1000 },
      { report_date: '2026-01-02', portfolio_value: 1000 },
    ]
    expect(deriveMemberSeries(rows, 1, null).map((p) => p.date)).toEqual(['2026-01-02'])
  })

  it('garantit le tri ASC même si la source est désordonnée', () => {
    const rows: ClubRow[] = [
      { report_date: '2026-01-03', portfolio_value: 3 },
      { report_date: '2026-01-01', portfolio_value: 1 },
      { report_date: '2026-01-02', portfolio_value: 2 },
    ]
    const series = deriveMemberSeries(rows, 1, null)
    expect(series.map((p) => p.date)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03'])
  })

  it('detentionPct non fini → série vide (aucun point NaN émis)', () => {
    const rows = makeDailyRows('2026-01-01', 3)
    expect(deriveMemberSeries(rows, NaN, null)).toEqual([])
  })
})

describe('computeVariation', () => {
  const point = (date: string, value: number): DashboardChartPoint => ({ date, value })

  it('d1 nominal : dernier point vs veille sur une série quotidienne', () => {
    const series = [point('2026-06-08', 100), point('2026-06-09', 102), point('2026-06-10', 105)]
    const v = computeVariation(series, 1)
    expect(v).not.toBeNull()
    expect(v?.amount).toBeCloseTo(3, 10) // 105 − 102
    expect(v?.percent).toBeCloseTo(3 / 102, 10)
  })

  it('d30 sur une série de 90 jours → point le plus proche de J−30', () => {
    const rows = makeDailyRows('2026-01-01', 90) // valeurs 1000..1089
    const series = deriveMemberSeries(rows, 1, null)
    const v = computeVariation(series, 30)
    // lastDate = J89 ; J−30 = J59 → start = 1059, end = 1089.
    expect(v?.amount).toBeCloseTo(1089 - 1059, 10)
    expect(v?.percent).toBeCloseTo(30 / 1059, 10)
  })

  it('d30 avec trous (week-ends) → point calendairement le plus proche', () => {
    const series = [
      point('2026-05-01', 100),
      point('2026-05-09', 110), // J−32 du dernier — le plus proche de J−30
      point('2026-05-14', 120), // J−27
      point('2026-06-10', 130),
    ]
    const v = computeVariation(series, 30)
    // Cible 2026-05-11 : 05-09 (2 j) bat 05-14 (3 j) → start = 110.
    expect(v?.amount).toBeCloseTo(20, 10)
    expect(v?.percent).toBeCloseTo(20 / 110, 10)
  })

  it('d30 sur une série de 10 jours (historique court) → premier point', () => {
    const rows = makeDailyRows('2026-06-01', 10) // valeurs 1000..1009
    const series = deriveMemberSeries(rows, 1, null)
    const v = computeVariation(series, 30)
    expect(v?.amount).toBeCloseTo(9, 10) // 1009 − 1000
    expect(v?.percent).toBeCloseTo(9 / 1000, 10)
  })

  it('max → premier vs dernier point', () => {
    const series = [point('2026-01-01', 200), point('2026-03-01', 150), point('2026-06-01', 260)]
    const v = computeVariation(series, 'max')
    expect(v?.amount).toBeCloseTo(60, 10)
    expect(v?.percent).toBeCloseTo(0.3, 10)
  })

  it('série vide → null', () => {
    expect(computeVariation([], 1)).toBeNull()
    expect(computeVariation([], 'max')).toBeNull()
  })

  it('un seul point → null', () => {
    expect(computeVariation([point('2026-06-10', 100)], 1)).toBeNull()
    expect(computeVariation([point('2026-06-10', 100)], 'max')).toBeNull()
  })

  it('start = 0 → null (pas de percent sur base nulle, pas de TrendBadge)', () => {
    const series = [point('2026-06-09', 0), point('2026-06-10', 100)]
    expect(computeVariation(series, 1)).toBeNull()
    expect(computeVariation(series, 'max')).toBeNull()
  })

  it('point de comparaison = dernier lui-même → null', () => {
    // J−1 du dernier est bien plus proche du dernier (1 j) que du premier (~151 j).
    const series = [point('2026-01-01', 100), point('2026-06-01', 110)]
    expect(computeVariation(series, 1)).toBeNull()
  })

  it('percent exact : 100 → 104.55 donne 0.0455 (à epsilon près)', () => {
    const series = [point('2026-06-09', 100), point('2026-06-10', 104.55)]
    const v = computeVariation(series, 1)
    expect(v?.amount).toBeCloseTo(4.55, 10)
    expect(v?.percent).toBeCloseTo(0.0455, 10)
  })
})

describe('getDashboardChartData', () => {
  const opts = { detentionPct: 0.1, joinedAt: null }

  it('retourne null si aucune ligne REPORTING (V2 reste en mode demo)', async () => {
    const supabase = makeSupabaseListMock([])
    const result = await getDashboardChartData(supabase, 'user-1', 'club-1', opts)
    expect(result).toBeNull()
  })

  it('rejette si la requête renvoie une erreur', async () => {
    const supabase = makeSupabaseListMock([], { message: 'boom' })
    await expect(getDashboardChartData(supabase, 'user-1', 'club-1', opts)).rejects.toThrow()
  })

  it('retourne null si la série est vide après cutoff joinedAt', async () => {
    const supabase = makeSupabaseListMock(makeDailyRows('2020-01-01', 5))
    const result = await getDashboardChartData(supabase, 'user-1', 'club-1', {
      detentionPct: 0.1,
      joinedAt: '2026-01-01', // postérieur à tout l'historique
    })
    expect(result).toBeNull()
  })

  it('compose série, variations et meta (câblage nominal)', async () => {
    const rows = makeDailyRows('2026-01-01', 90) // valeurs 1000..1089
    const supabase = makeSupabaseListMock(rows)

    const result = await getDashboardChartData(supabase, 'user-1', 'club-1', {
      detentionPct: 0.1,
      joinedAt: '2026-01-11', // coupe les 10 premiers jours
    })

    expect(result).not.toBeNull()
    expect(result?.source).toBe('live')
    // 90 jours − 10 coupés par le cutoff = 80 points, valeurs × 0.1.
    expect(result?.series).toHaveLength(80)
    expect(result?.series[0]).toEqual({ date: '2026-01-11', value: 101 })
    expect(result?.series[79]).toEqual({ date: '2026-03-31', value: 108.9 })
    // Variations câblées sur la série dérivée (d1 = dernier vs veille).
    expect(result?.variations.d1?.amount).toBeCloseTo(0.1, 10)
    expect(result?.variations.d30).not.toBeNull()
    expect(result?.variations.max?.amount).toBeCloseTo(108.9 - 101, 10)
    // Meta complète (debug / QA).
    expect(result?.meta).toEqual({
      clubId: 'club-1',
      pointCount: 80,
      firstDate: '2026-01-11',
      lastDate: '2026-03-31',
      detentionPctUsed: 0.1,
      joinedAtCutoff: '2026-01-11',
    })
  })

  it('meta.joinedAtCutoff = null quand joinedAt est absent ou non parseable', async () => {
    const rows = makeDailyRows('2026-01-01', 3)
    for (const joinedAt of [null, 'pas-une-date']) {
      const supabase = makeSupabaseListMock(rows)
      const result = await getDashboardChartData(supabase, 'user-1', 'club-1', {
        detentionPct: 1,
        joinedAt,
      })
      expect(result?.meta.joinedAtCutoff).toBeNull()
      expect(result?.meta.pointCount).toBe(3)
    }
  })

  it('pagine au-delà du plafond PostgREST de 1 000 lignes (.range en boucle)', async () => {
    const rows = makeDailyRows('2018-06-01', 2900) // ~série REPORTING réelle
    const rangeCalls: [number, number][] = []
    const supabase = makeSupabaseListMock(rows, null, rangeCalls)

    const result = await getDashboardChartData(supabase, 'user-1', 'club-1', {
      detentionPct: 1,
      joinedAt: null,
    })

    // 3 pages : 1000 + 1000 + 900 (page incomplète → stop).
    expect(rangeCalls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ])
    expect(result?.meta.pointCount).toBe(2900)
    expect(result?.meta.firstDate).toBe('2018-06-01')
    expect(result?.series).toHaveLength(2900)
  })

  it('pile 1 000 lignes : une page pleine puis une page vide (pas de boucle infinie)', async () => {
    const rows = makeDailyRows('2020-01-01', 1000)
    const rangeCalls: [number, number][] = []
    const supabase = makeSupabaseListMock(rows, null, rangeCalls)

    const result = await getDashboardChartData(supabase, 'user-1', 'club-1', {
      detentionPct: 1,
      joinedAt: null,
    })

    expect(rangeCalls).toEqual([
      [0, 999],
      [1000, 1999],
    ])
    expect(result?.meta.pointCount).toBe(1000)
  })
})
