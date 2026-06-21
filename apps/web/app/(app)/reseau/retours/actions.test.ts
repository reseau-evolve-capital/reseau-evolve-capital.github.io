// Tests de la Server Action updateFeedbackStatusAction (NET-019).
//
// Couvre : validation (id/statut), rejet sans session, succès (1 ligne → ok), RLS non-membre
// réseau (0 ligne renvoyée → forbidden), erreur SQL → update_failed.
//
// Mock du client Supabase serveur (cf. lib/feedback/actions.test.ts) + next/headers + next/cache.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateResult: vi.fn(),
}))

// Builder feedback chainable : update → eq → select (thenable → résout updateResult()).
function feedbackBuilder() {
  const builder: Record<string, unknown> = {}
  builder.update = () => builder
  builder.eq = () => builder
  builder.select = () => mocks.updateResult()
  return builder
}

vi.mock('@evolve/data', () => ({
  createServerClient: () => ({
    auth: { getUser: mocks.getUser },
    from: () => feedbackBuilder(),
  }),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => {} }),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/monitoring/sentry', () => ({ captureActionError: vi.fn() }))

import { updateFeedbackStatusAction } from './actions'

const USER = { id: 'net-user', email: 'net@example.com' }

beforeEach(() => {
  mocks.getUser.mockReset()
  mocks.updateResult.mockReset()
  mocks.getUser.mockResolvedValue({ data: { user: USER } })
})

describe('updateFeedbackStatusAction', () => {
  it('rejette un statut invalide sans toucher la DB', async () => {
    // @ts-expect-error — test d'entrée invalide volontaire
    const res = await updateFeedbackStatusAction('f1', 'bogus')
    expect(res).toEqual({ ok: false, error: 'invalid_status' })
    expect(mocks.updateResult).not.toHaveBeenCalled()
  })

  it('rejette un id vide', async () => {
    const res = await updateFeedbackStatusAction('', 'done')
    expect(res).toEqual({ ok: false, error: 'invalid_id' })
  })

  it('rejette sans session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const res = await updateFeedbackStatusAction('f1', 'done')
    expect(res).toEqual({ ok: false, error: 'unauthorized' })
  })

  it('succès : 1 ligne renvoyée → ok', async () => {
    mocks.updateResult.mockResolvedValue({ data: [{ id: 'f1' }], error: null })
    const res = await updateFeedbackStatusAction('f1', 'in_progress')
    expect(res).toEqual({ ok: true })
  })

  it('RLS non-membre réseau : 0 ligne → forbidden', async () => {
    mocks.updateResult.mockResolvedValue({ data: [], error: null })
    const res = await updateFeedbackStatusAction('f1', 'done')
    expect(res).toEqual({ ok: false, error: 'forbidden' })
  })

  it('erreur SQL → update_failed', async () => {
    mocks.updateResult.mockResolvedValue({ data: null, error: { message: 'boom', code: 'XX000' } })
    const res = await updateFeedbackStatusAction('f1', 'closed')
    expect(res).toEqual({ ok: false, error: 'update_failed' })
  })
})
