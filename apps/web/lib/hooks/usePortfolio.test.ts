import { describe, it, expect, vi, afterEach } from 'vitest'

import type { PortfolioData } from '@/lib/data/portfolio'
import { fetchPortfolio } from './usePortfolio'

const sample: PortfolioData = {
  clubId: 'club-1',
  userRole: 'member',
  syncedAt: '2026-05-31T10:00:00.000Z',
  positions: [
    {
      id: '1',
      name: 'META',
      symbol: 'NASDAQ:META',
      category: 'Actions',
      sector: 'Technologie',
      quantity: 10,
      pump: 100,
      market_price_eur: 180,
      market_value: 1800,
      book_value: 1000,
      allocation_pct: 50,
      gain_loss_eur: 800,
      gain_loss_pct: 80,
    },
  ],
}

/** PortfolioData « vide » tel que renvoyé par la route pour un club sans position (FIX-API-001). */
const empty: PortfolioData = {
  clubId: 'club-1',
  userRole: 'member',
  syncedAt: null,
  positions: [],
}

function mockFetch(init: { status: number; body?: unknown }) {
  return vi.fn().mockResolvedValue({
    status: init.status,
    ok: init.status >= 200 && init.status < 300,
    json: async () => init.body,
  } as Response)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchPortfolio', () => {
  it('200 avec positions → renvoie les données', async () => {
    vi.stubGlobal('fetch', mockFetch({ status: 200, body: sample }))
    await expect(fetchPortfolio()).resolves.toEqual(sample)
  })

  it('200 vide (positions: []) → null (état empty, pas de throw)', async () => {
    vi.stubGlobal('fetch', mockFetch({ status: 200, body: empty }))
    await expect(fetchPortfolio()).resolves.toBeNull()
  })

  it('404 (aucun club) → null (état empty)', async () => {
    vi.stubGlobal('fetch', mockFetch({ status: 404 }))
    await expect(fetchPortfolio()).resolves.toBeNull()
  })

  it('401 → throw (état error)', async () => {
    vi.stubGlobal('fetch', mockFetch({ status: 401 }))
    await expect(fetchPortfolio()).rejects.toThrow('portfolio_fetch_failed')
  })

  it('500 → throw (état error)', async () => {
    vi.stubGlobal('fetch', mockFetch({ status: 500 }))
    await expect(fetchPortfolio()).rejects.toThrow('portfolio_fetch_failed')
  })
})
