import { describe, it, expect, vi, afterEach } from 'vitest'
import { AlphaVantageProvider } from '../AlphaVantageProvider'

afterEach(() => vi.restoreAllMocks())

describe('AlphaVantageProvider', () => {
  it('parse le prix de Global Quote', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 'Global Quote': { '05. price': '487.23' } }),
      })
    )
    const p = new AlphaVantageProvider('key')
    const prices = await p.getPrices(['META'])
    expect(prices['META']).toBe(487.23)
  })

  it('null si réponse sans prix', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
    const p = new AlphaVantageProvider('key')
    const prices = await p.getPrices(['META'])
    expect(prices['META']).toBeNull()
  })

  it('null si la réponse HTTP est en erreur (ex 429)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) })
    )
    const p = new AlphaVantageProvider('key')
    const prices = await p.getPrices(['META'])
    expect(prices['META']).toBeNull()
  })
})
