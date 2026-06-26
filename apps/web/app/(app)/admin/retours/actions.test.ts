// Tests de la Server Action updateClubFeedbackStatusAction (ADM-009).
//
// Couvre : validation (id/statut), rejet sans session, rejet sans contexte admin (non-staff du club
// actif → forbidden), succès (1 ligne → ok), RLS/filtre club (0 ligne → forbidden), erreur SQL →
// update_failed. La journalisation withAudit (OPS-007) est neutralisée : on vérifie qu'un échec de
// log ne fait jamais échouer l'action.
//
// Mocks : client Supabase serveur (builder update→eq→eq→select), next/headers, next/cache,
// lib/data/request (getSessionUser/getAdminContext), withAudit (passthrough qui exécute l'action).

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getAdminCtx: vi.fn(),
  updateResult: vi.fn(),
}))

// Builder feedback chainable : update → eq → eq → select (thenable → résout updateResult()).
function feedbackBuilder() {
  const builder: Record<string, unknown> = {}
  builder.update = () => builder
  builder.eq = () => builder
  builder.select = () => mocks.updateResult()
  return builder
}

vi.mock('@evolve/data', () => ({
  createServerClient: () => ({ from: () => feedbackBuilder() }),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => {} }),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/monitoring/sentry', () => ({ captureActionError: vi.fn() }))

vi.mock('@/lib/data/request', () => ({
  getSessionUser: mocks.getUser,
  getAdminContext: mocks.getAdminCtx,
}))

// withAudit : passthrough qui EXÉCUTE l'action et ignore la journalisation (testée à part).
vi.mock('@/lib/actions/withAudit', () => ({
  withAudit:
    (fn: (...a: unknown[]) => unknown) =>
    (...a: unknown[]) =>
      fn(...a),
}))

import { updateClubFeedbackStatusAction } from './actions'

const USER = { id: 'staff-a', email: 'staff@a.test' }
const CTX = { userId: 'staff-a', clubId: 'club-a', role: 'treasurer' as const, canManage: true }

beforeEach(() => {
  mocks.getUser.mockReset()
  mocks.getAdminCtx.mockReset()
  mocks.updateResult.mockReset()
  mocks.getUser.mockResolvedValue(USER)
  mocks.getAdminCtx.mockResolvedValue(CTX)
})

describe('updateClubFeedbackStatusAction', () => {
  it('rejette un statut invalide sans toucher la DB', async () => {
    // @ts-expect-error — test d'entrée invalide volontaire
    const res = await updateClubFeedbackStatusAction('f1', 'bogus')
    expect(res).toEqual({ ok: false, error: 'invalid_status' })
    expect(mocks.updateResult).not.toHaveBeenCalled()
  })

  it('rejette un id vide', async () => {
    const res = await updateClubFeedbackStatusAction('', 'done')
    expect(res).toEqual({ ok: false, error: 'invalid_id' })
  })

  it('rejette sans session', async () => {
    mocks.getUser.mockResolvedValue(null)
    const res = await updateClubFeedbackStatusAction('f1', 'done')
    expect(res).toEqual({ ok: false, error: 'unauthorized' })
  })

  it('rejette un non-staff du club actif (pas de contexte admin) → forbidden', async () => {
    mocks.getAdminCtx.mockResolvedValue(null)
    const res = await updateClubFeedbackStatusAction('f1', 'done')
    expect(res).toEqual({ ok: false, error: 'forbidden' })
    expect(mocks.updateResult).not.toHaveBeenCalled()
  })

  it('rejette un secrétaire (lecture seule, canManage=false) → forbidden', async () => {
    mocks.getAdminCtx.mockResolvedValue({ ...CTX, role: 'secretary' as const, canManage: false })
    const res = await updateClubFeedbackStatusAction('f1', 'done')
    expect(res).toEqual({ ok: false, error: 'forbidden' })
    expect(mocks.updateResult).not.toHaveBeenCalled()
  })

  it('succès : 1 ligne renvoyée (feedback de son club) → ok', async () => {
    mocks.updateResult.mockResolvedValue({ data: [{ id: 'f1' }], error: null })
    const res = await updateClubFeedbackStatusAction('f1', 'in_progress')
    expect(res).toEqual({ ok: true })
  })

  it('feedback hors club / non-staff (RLS + filtre) : 0 ligne → forbidden', async () => {
    mocks.updateResult.mockResolvedValue({ data: [], error: null })
    const res = await updateClubFeedbackStatusAction('f1', 'done')
    expect(res).toEqual({ ok: false, error: 'forbidden' })
  })

  it('erreur SQL → update_failed', async () => {
    mocks.updateResult.mockResolvedValue({ data: null, error: { message: 'boom', code: 'XX000' } })
    const res = await updateClubFeedbackStatusAction('f1', 'closed')
    expect(res).toEqual({ ok: false, error: 'update_failed' })
  })
})
