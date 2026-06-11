import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  analyticsEvents,
  clearAnalyticsUser,
  countBucket,
  setAnalyticsUser,
  track,
  valueBucket,
} from './analytics'

// Le runner vitest d'apps/web tourne en environnement `node` (pas de `window`). On simule
// donc `globalThis.window` (la source teste `typeof window` + `window.gtag`).
afterEach(() => {
  delete (globalThis as { window?: unknown }).window
  vi.restoreAllMocks()
})

function mockGtag() {
  const gtag = vi.fn()
  ;(globalThis as { window?: unknown }).window = { gtag }
  return gtag
}

describe('valueBucket', () => {
  it('bucketise sans jamais exposer la valeur exacte', () => {
    expect(valueBucket(0)).toBe('<10k')
    expect(valueBucket(9_999)).toBe('<10k')
    expect(valueBucket(10_000)).toBe('10-50k')
    expect(valueBucket(49_999)).toBe('10-50k')
    expect(valueBucket(50_000)).toBe('50-100k')
    expect(valueBucket(100_000)).toBe('>100k')
    expect(valueBucket(1_000_000)).toBe('>100k')
  })

  it('gère null / NaN → "unknown"', () => {
    expect(valueBucket(null)).toBe('unknown')
    expect(valueBucket(undefined)).toBe('unknown')
    expect(valueBucket(NaN)).toBe('unknown')
  })
})

describe('countBucket', () => {
  it('bucketise les compteurs', () => {
    expect(countBucket(1)).toBe('1-5')
    expect(countBucket(5)).toBe('1-5')
    expect(countBucket(6)).toBe('6-10')
    expect(countBucket(11)).toBe('11-20')
    expect(countBucket(21)).toBe('>20')
    expect(countBucket(null)).toBe('unknown')
  })
})

describe('track', () => {
  it('émet vers window.gtag quand présent', () => {
    const gtag = mockGtag()
    track('portfolio_viewed', { portfolio_value_bucket: '10-50k' })
    expect(gtag).toHaveBeenCalledWith('event', 'portfolio_viewed', {
      portfolio_value_bucket: '10-50k',
    })
  })

  it('no-op silencieux sans gtag (dev/CI sans GA)', () => {
    expect(() => track('whatever', {})).not.toThrow()
  })
})

describe('analyticsEvents (key events)', () => {
  it('portfolio.viewed mappe les buckets sur les bons paramètres', () => {
    const gtag = mockGtag()
    analyticsEvents.portfolio.viewed({ valueBucket: '50-100k', positionsBucket: '6-10' })
    expect(gtag).toHaveBeenCalledWith('event', 'portfolio_viewed', {
      portfolio_value_bucket: '50-100k',
      positions_count_bucket: '6-10',
    })
  })

  it('attestation.downloaded — défaut in_app', () => {
    const gtag = mockGtag()
    analyticsEvents.attestation.downloaded()
    expect(gtag).toHaveBeenCalledWith('event', 'attestation_download', {
      document_type: 'detention',
      trigger_source: 'in_app',
    })
  })

  it('onboarding.completed + login_completed émettent leurs events', () => {
    const gtag = mockGtag()
    analyticsEvents.onboarding.completed()
    analyticsEvents.auth.loginCompleted()
    expect(gtag).toHaveBeenCalledWith('event', 'onboarding_completed', {})
    expect(gtag).toHaveBeenCalledWith('event', 'login_completed', {
      method: 'magic_link',
      is_first_login: undefined,
    })
  })
})

describe('analyticsEvents.dashboard (expérience A/B V1/V2)', () => {
  it('dashboard.viewed V1 — params exacts, chart_data_source omis (undefined)', () => {
    const gtag = mockGtag()
    analyticsEvents.dashboard.viewed({
      variant: 'v1',
      valueBucket: '10-50k',
      contributionStatus: 'ok',
    })
    expect(gtag).toHaveBeenCalledWith('event', 'dashboard_viewed', {
      dashboard_variant: 'v1',
      portfolio_value_bucket: '10-50k',
      contribution_status: 'ok',
      chart_data_source: undefined,
    })
  })

  it('dashboard.viewed V2 — porte chart_data_source', () => {
    const gtag = mockGtag()
    analyticsEvents.dashboard.viewed({
      variant: 'v2',
      valueBucket: '>100k',
      contributionStatus: 'late',
      chartDataSource: 'live',
    })
    expect(gtag).toHaveBeenCalledWith('event', 'dashboard_viewed', {
      dashboard_variant: 'v2',
      portfolio_value_bucket: '>100k',
      contribution_status: 'late',
      chart_data_source: 'live',
    })
  })

  it('dashboard.chartPeriodChanged — variante forcée v2 + période', () => {
    const gtag = mockGtag()
    analyticsEvents.dashboard.chartPeriodChanged({ period: '30d', chartDataSource: 'demo' })
    expect(gtag).toHaveBeenCalledWith('event', 'dashboard_chart_period_changed', {
      dashboard_variant: 'v2',
      period: '30d',
      chart_data_source: 'demo',
    })
  })

  it('dashboard.heroDetailOpened — porte uniquement la variante', () => {
    const gtag = mockGtag()
    analyticsEvents.dashboard.heroDetailOpened({ variant: 'v1' })
    expect(gtag).toHaveBeenCalledWith('event', 'dashboard_hero_detail_opened', {
      dashboard_variant: 'v1',
    })
  })

  it('anti-PII : aucun paramètre dashboard ne porte de montant numérique exact', () => {
    const gtag = mockGtag()
    // Montant exact en entrée → DOIT être bucketisé en amont via valueBucket().
    analyticsEvents.dashboard.viewed({
      variant: 'v2',
      valueBucket: valueBucket(42_137.53),
      contributionStatus: 'late',
      chartDataSource: 'live',
    })
    analyticsEvents.dashboard.chartPeriodChanged({ period: '1y', chartDataSource: 'live' })
    analyticsEvents.dashboard.heroDetailOpened({ variant: 'v2' })
    const calls = gtag.mock.calls as [string, string, Record<string, unknown>][]
    expect(calls).toHaveLength(3)
    for (const [, , params] of calls) {
      for (const value of Object.values(params)) {
        // Jamais de nombre (montant/valo) en paramètre — buckets et enums uniquement.
        expect(typeof value).not.toBe('number')
      }
    }
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'dashboard_viewed',
      expect.objectContaining({ portfolio_value_bucket: '10-50k' })
    )
  })
})

describe('user identity (consent-gated en amont par AnalyticsIdentify)', () => {
  it('setAnalyticsUser pose user_id + user_properties', () => {
    const gtag = mockGtag()
    setAnalyticsUser('abcd1234', { user_type: 'member', club_count: 2 })
    expect(gtag).toHaveBeenCalledWith('set', { user_id: 'abcd1234' })
    expect(gtag).toHaveBeenCalledWith('set', 'user_properties', {
      user_type: 'member',
      club_count: 2,
    })
  })

  it('clearAnalyticsUser retire le user_id', () => {
    const gtag = mockGtag()
    clearAnalyticsUser()
    expect(gtag).toHaveBeenCalledWith('set', { user_id: null })
  })
})
