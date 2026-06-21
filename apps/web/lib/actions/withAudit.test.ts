// Tests du wrapper d'audit `withAudit` (OPS-007, fire-and-forget, append-only).
//
// Cœur de la spec (critère bloquant) : un échec d'écriture du log NE FAIT JAMAIS échouer la
// mutation. On le prouve sous trois formes : RPC qui renvoie une erreur « douce », et RPC qui LÈVE.
// Dans les deux cas, le résultat de l'action est renvoyé intact. On vérifie aussi que le log est
// appelé avec les bons arguments après succès, et qu'il n'est PAS appelé quand l'action échoue
// (lève) ni quand `shouldLog` renvoie false.
//
// Mock du client Supabase serveur (cf. lib/feedback/actions.test.ts) : on remplace `createServerClient`
// (@evolve/data), `cookies` (next/headers) et `captureActionError` (monitoring/sentry).

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  captureActionError: vi.fn(),
}))

vi.mock('@evolve/data', () => ({
  createServerClient: () => ({ rpc: mocks.rpc }),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => {} }),
}))

vi.mock('@/lib/monitoring/sentry', () => ({
  captureActionError: mocks.captureActionError,
}))

import { withAudit } from './withAudit'

beforeEach(() => {
  mocks.rpc.mockReset()
  mocks.captureActionError.mockReset()
  // Par défaut, le RPC réussit (pas d'erreur).
  mocks.rpc.mockResolvedValue({ error: null })
})

describe('withAudit', () => {
  it('journalise après succès avec les bons arguments (action, cible dérivée, metadata)', async () => {
    const fn = vi.fn(async (_clubId: string) => ({ ok: true as const }))
    const wrapped = withAudit(fn, {
      action: 'deleteClub',
      targetType: 'club',
      targetId: (_r, clubId: string) => clubId,
      metadata: (_r, clubId: string) => ({ clubId }),
    })

    const result = await wrapped('club-42')

    expect(result).toEqual({ ok: true })
    expect(mocks.rpc).toHaveBeenCalledOnce()
    const [rpcName, args] = mocks.rpc.mock.calls[0]!
    expect(rpcName).toBe('log_audit_event')
    expect(args).toMatchObject({
      p_action: 'deleteClub',
      p_target_type: 'club',
      p_target_id: 'club-42',
      p_metadata: { clubId: 'club-42' },
    })
    // Aucun échec → Sentry non sollicité.
    expect(mocks.captureActionError).not.toHaveBeenCalled()
  })

  it('CRITIQUE — si le log échoue (RPC renvoie une erreur), la mutation réussit quand même', async () => {
    mocks.rpc.mockResolvedValue({ error: { code: '42501', message: 'rls denied' } })
    const fn = vi.fn(async (_clubId: string) => ({ ok: true as const }))
    const wrapped = withAudit(fn, { action: 'deleteClub' })

    // Ne doit JAMAIS lever, et doit renvoyer le résultat de l'action intact.
    const result = await wrapped('club-1')

    expect(result).toEqual({ ok: true })
    expect(fn).toHaveBeenCalledOnce()
    // L'erreur du log est captée par Sentry, jamais propagée.
    expect(mocks.captureActionError).toHaveBeenCalledOnce()
  })

  it('CRITIQUE — si le RPC de log LÈVE, la mutation réussit quand même (jamais re-throw)', async () => {
    mocks.rpc.mockRejectedValue(new Error('connexion DB perdue'))
    const fn = vi.fn(async () => ({ ok: true as const, clubId: 'created-9' }))
    const wrapped = withAudit(fn, { action: 'createClub', targetType: 'club' })

    const result = await wrapped()

    expect(result).toEqual({ ok: true, clubId: 'created-9' })
    expect(mocks.captureActionError).toHaveBeenCalledOnce()
  })

  it("ne journalise PAS si l'action LÈVE (pas de mutation → rien à auditer) et propage l'erreur", async () => {
    const boom = new Error('action métier en échec')
    const fn = vi.fn(async () => {
      throw boom
    })
    const wrapped = withAudit(fn, { action: 'deleteClub' })

    await expect(wrapped()).rejects.toThrow('action métier en échec')
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.captureActionError).not.toHaveBeenCalled()
  })

  it('respecte shouldLog : ne journalise pas un résultat { ok: false }', async () => {
    const fn = vi.fn(async () => ({ ok: false as const, error: 'forbidden' }))
    const wrapped = withAudit(fn, {
      action: 'deleteClub',
      shouldLog: (r) => r.ok,
    })

    const result = await wrapped()

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('préserve la signature : renvoie une fonction de même arité d’appel et type de retour', async () => {
    const fn = vi.fn(async (a: number, b: number) => ({ ok: true as const, sum: a + b }))
    const wrapped = withAudit(fn, { action: 'sum' })

    const result = await wrapped(2, 3)

    expect(result).toEqual({ ok: true, sum: 5 })
    expect(fn).toHaveBeenCalledWith(2, 3)
  })

  it('omet target/metadata (undefined côté RPC) quand le descripteur ne les fournit pas', async () => {
    const fn = vi.fn(async () => ({ ok: true as const }))
    const wrapped = withAudit(fn, { action: 'minimalAction' })

    await wrapped()

    const [, args] = mocks.rpc.mock.calls[0]!
    expect(args.p_action).toBe('minimalAction')
    expect(args.p_target_type).toBeUndefined()
    expect(args.p_target_id).toBeUndefined()
    // metadata par défaut = {} (jamais undefined côté contrat).
    expect(args.p_metadata).toEqual({})
  })
})
