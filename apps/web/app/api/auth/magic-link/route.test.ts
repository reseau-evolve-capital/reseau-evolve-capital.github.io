import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  signInWithOtp: vi.fn(),
}))
vi.mock('@evolve/data', () => ({
  createServerClient: () => ({
    rpc: mocks.rpc,
    auth: { signInWithOtp: mocks.signInWithOtp },
  }),
}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => {} }),
}))

import { POST } from './route'

function req(body: unknown, ip = '1.2.3.4') {
  return new Request('http://localhost:3001/api/auth/magic-link', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mocks.rpc.mockReset()
  mocks.signInWithOtp.mockReset()
})

describe('POST /api/auth/magic-link', () => {
  it('400 si email invalide', async () => {
    const res = await POST(req({ email: 'pas-un-email' }))
    expect(res.status).toBe(400)
  })

  it("403 si l'email n'est pas invité", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null })
    const res = await POST(req({ email: 'unknown@example.com' }))
    expect(res.status).toBe(403)
    expect(mocks.signInWithOtp).not.toHaveBeenCalled()
  })

  it('200 + signInWithOtp si email invité', async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null })
    mocks.signInWithOtp.mockResolvedValue({ error: null })
    const res = await POST(req({ email: 'test@example.com' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sent: true })
    expect(mocks.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining('/login/verify'),
          // Locale transmise (défaut 'fr' sans cookie NEXT_LOCALE) → user_metadata.locale.
          data: { locale: 'fr' },
        }),
      })
    )
  })

  it('500 si le RPC email_is_invited échoue', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const res = await POST(req({ email: 'test@example.com' }))
    expect(res.status).toBe(500)
    expect(mocks.signInWithOtp).not.toHaveBeenCalled()
  })

  it("502 si signInWithOtp échoue (vraie panne d'envoi)", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null })
    mocks.signInWithOtp.mockResolvedValue({ error: { message: 'smtp down' } })
    const res = await POST(req({ email: 'test@example.com' }))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: "Impossible d'envoyer le lien." })
  })

  it('429 si signInWithOtp est rate-limité par Supabase (status 429)', async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null })
    // AuthApiError de GoTrue : status HTTP 429 → on doit renvoyer notre 429, pas le 502 générique.
    mocks.signInWithOtp.mockResolvedValue({
      error: {
        status: 429,
        code: 'over_email_send_rate_limit',
        message: 'email rate limit exceeded',
      },
    })
    const res = await POST(req({ email: 'test@example.com' }))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBeTruthy()
    expect(await res.json()).toEqual({
      error: 'Trop de tentatives. Réessaie dans quelques minutes.',
    })
  })

  it('429 si signInWithOtp expose le code over_email_send_rate_limit sans status', async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null })
    // Filet : certaines versions n'exposent que le code GoTrue (pas de status HTTP exploitable).
    mocks.signInWithOtp.mockResolvedValue({
      error: { code: 'over_email_send_rate_limit', message: 'over_email_send_rate_limit' },
    })
    const res = await POST(req({ email: 'test@example.com' }))
    expect(res.status).toBe(429)
  })
})
