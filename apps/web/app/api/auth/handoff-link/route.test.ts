import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  generateLink: vi.fn(),
}))
vi.mock('@evolve/data', () => ({
  createServerClient: () => ({
    auth: { getUser: mocks.getUser },
  }),
  createServiceRoleClient: () => ({
    auth: { admin: { generateLink: mocks.generateLink } },
  }),
}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => {} }),
}))

import { POST } from './route'

beforeEach(() => {
  mocks.getUser.mockReset()
  mocks.generateLink.mockReset()
})

describe('POST /api/auth/handoff-link', () => {
  it('401 si pas de session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const res = await POST()
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthenticated' })
    expect(mocks.generateLink).not.toHaveBeenCalled()
  })

  it("401 si l'utilisateur n'a pas d'email", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: null } } })
    const res = await POST()
    expect(res.status).toBe(401)
    expect(mocks.generateLink).not.toHaveBeenCalled()
  })

  it('200 + URL portable vers /login/verify (token_hash, type=email, pwa=ios)', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'membre@example.com' } } })
    mocks.generateLink.mockResolvedValue({
      data: { properties: { hashed_token: 'HASH' } },
      error: null,
    })
    const res = await POST()
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    // On ne frappe un lien que pour l'email de l'appelant — jamais un email arbitraire.
    expect(mocks.generateLink).toHaveBeenCalledWith({
      type: 'magiclink',
      email: 'membre@example.com',
    })
    const body = (await res.json()) as { url: string }
    expect(body.url).toContain('/login/verify')
    expect(body.url).toContain('token_hash=HASH')
    expect(body.url).toContain('type=email')
    expect(body.url).toContain('pwa=ios')
  })

  it('500 si generateLink échoue', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'membre@example.com' } } })
    mocks.generateLink.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const res = await POST()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'mint_failed' })
  })

  it('500 si hashed_token absent', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'membre@example.com' } } })
    mocks.generateLink.mockResolvedValue({ data: { properties: {} }, error: null })
    const res = await POST()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'mint_failed' })
  })
})
