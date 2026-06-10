import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}))
vi.mock('@evolve/data', () => ({
  createServerClient: () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      verifyOtp: mocks.verifyOtp,
    },
  }),
}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => {} }),
}))

import { GET } from './route'

function req(query: string) {
  return new Request(`http://localhost:3001/login/verify?${query}`)
}

function location(res: Response): string {
  return res.headers.get('location') ?? ''
}

beforeEach(() => {
  mocks.exchangeCodeForSession.mockReset()
  mocks.verifyOtp.mockReset()
})

describe('GET /login/verify', () => {
  it('redirige /login/verify/expired si ni code ni token_hash', async () => {
    const res = await GET(req(''))
    expect(location(res)).toContain('/login/verify/expired')
  })

  it('redirige /login/verify/expired si Supabase renvoie ?error', async () => {
    const res = await GET(req('error=access_denied&token_hash=x&type=email'))
    expect(location(res)).toContain('/login/verify/expired')
  })

  it('flux nominal token_hash → /dashboard', async () => {
    mocks.verifyOtp.mockResolvedValue({ error: null })
    const res = await GET(req('token_hash=HASH&type=email'))
    expect(location(res)).toContain('/dashboard')
    expect(location(res)).not.toContain('pwa=ios')
  })

  it('relais PWA : token_hash + pwa=ios → /dashboard?pwa=ios', async () => {
    mocks.verifyOtp.mockResolvedValue({ error: null })
    const res = await GET(req('token_hash=HASH&type=email&pwa=ios'))
    expect(location(res)).toContain('/dashboard?pwa=ios')
  })

  it("invitation : pwa=ios n'altère pas la branche onboarding", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: null })
    const res = await GET(req('token_hash=HASH&type=email&invited=1&pwa=ios'))
    expect(location(res)).toContain('/onboarding/step-1?invited=1')
    expect(location(res)).not.toContain('pwa=ios')
  })

  it('redirige /login/verify/expired si verifyOtp échoue', async () => {
    mocks.verifyOtp.mockResolvedValue({ error: { message: 'expired' } })
    const res = await GET(req('token_hash=HASH&type=email'))
    expect(location(res)).toContain('/login/verify/expired')
  })
})
