import { describe, it, expect, vi, afterEach } from 'vitest'

import type { DashboardData } from '@/lib/data/dashboard'
import { fetchDashboard } from './useDashboard'

const sample: DashboardData = {
  member: { firstname: 'Léa', fullName: 'Léa Martin', role: 'member', joinedAt: null },
  clubId: 'club-1',
  netMarketValue: 1000,
  detentionPct: 0.25,
  totalContributed: 500,
  contribution: { status: 'ok', amountDue: 0 },
  club: { name: 'Club Test' },
  syncedAt: '2026-05-31T10:00:00.000Z',
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

describe('fetchDashboard', () => {
  it('200 → renvoie les données', async () => {
    vi.stubGlobal('fetch', mockFetch({ status: 200, body: sample }))
    await expect(fetchDashboard()).resolves.toEqual(sample)
  })

  it('404 → renvoie null (état empty)', async () => {
    vi.stubGlobal('fetch', mockFetch({ status: 404 }))
    await expect(fetchDashboard()).resolves.toBeNull()
  })

  it('500 → throw (état error)', async () => {
    vi.stubGlobal('fetch', mockFetch({ status: 500 }))
    await expect(fetchDashboard()).rejects.toThrow('dashboard_fetch_failed')
  })
})
