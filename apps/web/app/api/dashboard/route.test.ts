import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { DashboardData } from '@/lib/data/dashboard'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getDashboardData: vi.fn(),
}))
vi.mock('@evolve/data', () => ({
  createServerClient: () => ({ auth: { getUser: mocks.getUser }, from: () => ({}) }),
}))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }))
vi.mock('@/lib/data/dashboard', () => ({ getDashboardData: mocks.getDashboardData }))

import { GET } from './route'

// club_id explicite dans l'URL → la route saute le lookup memberships (pas de `.from()` réel).
function req() {
  return new Request('http://localhost:3001/api/dashboard?club_id=club-1')
}

const fakeData = { netMarketValue: 68153.14 } as unknown as DashboardData

beforeEach(() => {
  mocks.getUser.mockReset()
  mocks.getDashboardData.mockReset()
})

describe('GET /api/dashboard', () => {
  // Régression « quote-part périmée sur Safari/PWA » : la réponse par-membre ne doit JAMAIS
  // être cachable (ni CDN partagé, ni service worker). Cf. public/sw.js (respecte no-store).
  it('répond avec Cache-Control: private, no-store', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mocks.getDashboardData.mockResolvedValue(fakeData)

    const res = await GET(req())

    expect(res.status).toBe(200)
    const cc = res.headers.get('cache-control') ?? ''
    expect(cc).toContain('no-store')
    expect(cc).not.toMatch(/s-maxage|stale-while-revalidate/i)
  })
})
