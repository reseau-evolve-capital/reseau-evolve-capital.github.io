import { describe, it, expect, vi, afterEach } from 'vitest'
import { GoogleAppsScriptProvider } from '../GoogleAppsScriptProvider.ts'

afterEach(() => vi.restoreAllMocks())

describe('GoogleAppsScriptProvider', () => {
  it('récupère les prix et complète les symboles manquants par null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ prices: { 'NASDAQ:META': 487.23 } }),
      })
    )
    const p = new GoogleAppsScriptProvider('https://example.com', 'secret')
    const prices = await p.getPrices(['NASDAQ:META', 'EURONEXT:MC'])
    expect(prices['NASDAQ:META']).toBe(487.23)
    expect(prices['EURONEXT:MC']).toBeNull()
  })

  it("retourne null pour tous les symboles en cas d'erreur réseau", async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    const p = new GoogleAppsScriptProvider('https://example.com', 'secret')
    const prices = await p.getPrices(['NASDAQ:META'])
    expect(prices['NASDAQ:META']).toBeNull()
  })

  it('lève si URL ou secret manquant', () => {
    expect(() => new GoogleAppsScriptProvider('', '')).toThrow()
  })
})
