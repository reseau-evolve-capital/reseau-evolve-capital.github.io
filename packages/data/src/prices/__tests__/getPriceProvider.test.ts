import { describe, it, expect, afterEach, vi } from 'vitest'
import { getPricesWithFallback } from '../getPriceProvider.ts'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('getPricesWithFallback', () => {
  it('sans aucun provider configuré : retourne tous les symboles à null (pas de throw)', async () => {
    vi.stubEnv('GOOGLE_APPS_SCRIPT_URL', '')
    vi.stubEnv('GOOGLE_APPS_SCRIPT_SECRET', '')
    vi.stubEnv('GOOGLE_SHEETS_PRICE_SHEET_ID', '')
    vi.stubEnv('ALPHA_VANTAGE_KEY', '')
    const prices = await getPricesWithFallback(['NASDAQ:META'])
    expect(prices).toEqual({ 'NASDAQ:META': null })
  })

  it('utilise Apps Script si configuré', async () => {
    vi.stubEnv('GOOGLE_APPS_SCRIPT_URL', 'https://example.com')
    vi.stubEnv('GOOGLE_APPS_SCRIPT_SECRET', 'secret')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ prices: { 'NASDAQ:META': 100 } }),
      })
    )
    const prices = await getPricesWithFallback(['NASDAQ:META'])
    expect(prices['NASDAQ:META']).toBe(100)
  })
})
