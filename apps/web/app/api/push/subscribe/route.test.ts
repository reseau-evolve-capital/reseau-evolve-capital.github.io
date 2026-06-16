import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock du client Supabase (RLS de session) : auth.getUser + from(table).upsert(...).
// On capture les upserts par table pour vérifier le contrat (subscription + préférences).
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upsertSubscriptions: vi.fn(),
  upsertPreferences: vi.fn(),
}))

vi.mock('@evolve/data', () => ({
  createServerClient: () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) => ({
      upsert: (values: unknown, opts: unknown) =>
        table === 'push_subscriptions'
          ? mocks.upsertSubscriptions(values, opts)
          : mocks.upsertPreferences(values, opts),
    }),
  }),
}))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }))

import { POST } from './route'

const validBody = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
  userAgent: 'Mozilla/5.0',
  platform: 'desktop',
}

function req(body: unknown) {
  return new Request('http://localhost:3001/api/push/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mocks.getUser.mockReset()
  mocks.upsertSubscriptions.mockReset()
  mocks.upsertPreferences.mockReset()
  mocks.upsertSubscriptions.mockResolvedValue({ error: null })
  mocks.upsertPreferences.mockResolvedValue({ error: null })
})

describe('POST /api/push/subscribe', () => {
  it('401 si pas de session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await POST(req(validBody))
    expect(res.status).toBe(401)
    expect(mocks.upsertSubscriptions).not.toHaveBeenCalled()
  })

  it('500 si erreur d’authentification', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'boom' } })
    const res = await POST(req(validBody))
    expect(res.status).toBe(500)
  })

  it('400 si la subscription est incomplète (clés manquantes)', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const res = await POST(req({ endpoint: 'https://x', keys: {} }))
    expect(res.status).toBe(400)
    expect(mocks.upsertSubscriptions).not.toHaveBeenCalled()
  })

  it('201 + upsert subscription & préférences pour une session valide', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const res = await POST(req(validBody))
    expect(res.status).toBe(201)

    expect(mocks.upsertSubscriptions).toHaveBeenCalledTimes(1)
    const subCall = mocks.upsertSubscriptions.mock.calls[0]!
    expect(subCall[0]).toMatchObject({
      user_id: 'u1',
      endpoint: validBody.endpoint,
      p256dh: 'p256dh-key',
      auth: 'auth-key',
      platform: 'desktop',
    })
    expect(subCall[1]).toMatchObject({ onConflict: 'endpoint' })

    expect(mocks.upsertPreferences).toHaveBeenCalledTimes(1)
    expect(mocks.upsertPreferences.mock.calls[0]![0]).toMatchObject({ user_id: 'u1' })
  })

  it('normalise une plateforme inconnue en "unknown"', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    await POST(req({ ...validBody, platform: 'bogus-platform' }))
    expect(mocks.upsertSubscriptions.mock.calls[0]![0].platform).toBe('unknown')
  })

  it('500 si l’upsert de la subscription échoue', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mocks.upsertSubscriptions.mockResolvedValue({ error: { message: 'db down' } })
    const res = await POST(req(validBody))
    expect(res.status).toBe(500)
  })
})
