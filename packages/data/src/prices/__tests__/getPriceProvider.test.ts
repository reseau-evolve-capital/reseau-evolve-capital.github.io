import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getPricesWithFallback } from '../getPriceProvider'

const OLD = { ...process.env }
beforeEach(() => {
  vi.restoreAllMocks()
})
afterEach(() => {
  process.env = { ...OLD }
})

describe('getPricesWithFallback', () => {
  it('sans aucun provider configuré : retourne tous les symboles à null (pas de throw)', async () => {
    delete process.env['GOOGLE_APPS_SCRIPT_URL']
    delete process.env['GOOGLE_APPS_SCRIPT_SECRET']
    delete process.env['GOOGLE_SHEETS_PRICE_SHEET_ID']
    delete process.env['ALPHA_VANTAGE_KEY']
    const prices = await getPricesWithFallback(['NASDAQ:META'])
    expect(prices).toEqual({ 'NASDAQ:META': null })
  })

  it('utilise Apps Script si configuré', async () => {
    process.env['GOOGLE_APPS_SCRIPT_URL'] = 'https://example.com'
    process.env['GOOGLE_APPS_SCRIPT_SECRET'] = 'secret'
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
