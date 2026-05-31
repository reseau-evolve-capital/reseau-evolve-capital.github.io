import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
}))
vi.mock('@evolve/data', () => ({
  createServerClient: () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({ update: mocks.update, select: mocks.select }),
  }),
}))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }))

import { POST } from './route'

const validBody = {
  firstname: 'Léa',
  lastname: 'Martin',
  phone: null,
  address: null,
  avatar_url: null,
  rgpd_consented: true,
  directory_opt_in: false,
}
function req(body: unknown) {
  return new Request('http://localhost:3001/api/onboarding/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mocks.getUser.mockReset()
  mocks.update.mockReset()
  mocks.eq.mockReset()
  mocks.select.mockReset()
  mocks.update.mockReturnValue({ eq: mocks.eq })
})

describe('POST /api/onboarding/profile', () => {
  it('422 si rgpd_consented !== true', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@example.com' } },
      error: null,
    })
    const res = await POST(req({ ...validBody, rgpd_consented: false }))
    expect(res.status).toBe(422)
  })

  it('401 si pas de session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await POST(req(validBody))
    expect(res.status).toBe(401)
  })

  it('403 si la ligne users est absente', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@example.com' } },
      error: null,
    })
    mocks.select.mockReturnValue({
      eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
    })
    const res = await POST(req(validBody))
    expect(res.status).toBe(403)
  })

  it('200 + onboarding_completed si OK', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@example.com' } },
      error: null,
    })
    mocks.select.mockReturnValue({
      eq: () => ({ maybeSingle: async () => ({ data: { id: 'u1' }, error: null }) }),
    })
    mocks.eq.mockResolvedValue({ data: null, error: null })
    const res = await POST(req(validBody))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ user_id: 'u1', onboarding_completed: true })
  })
})
