// Tests des Server Actions du Bureau du réseau (NET-020) : grantBoardRoleAction / revokeBoardRoleAction.
//
// Couvre les critères d'acceptation NET-020 côté serveur :
//   - grant/revoke RÉSERVÉS network_admin → un network_board est refusé (test négatif).
//   - refus « dernier admin » propagé : la RPC lève check_violation avec le message dédié
//     → la Server Action renvoie la clé métier `last_admin` (rendue en data-warning côté UI).
//   - validation d'entrée (uuid, rôle, titre) sans toucher la DB.
//   - happy paths grant + revoke.
//   - l'audit (withAudit) ne fait JAMAIS échouer la mutation (log mocké en erreur → action OK).
//
// Mocks : client Supabase serveur (auth.getUser + rpc), resolveNetworkContext (rôle réseau),
// next/headers + next/cache, captureActionError. On NE mocke PAS withAudit : on le laisse tourner
// pour prouver qu'un log raté n'impacte pas le résultat (le RPC log_audit_event passe par le rpc mock).

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  resolveNetworkContext: vi.fn(),
}))

vi.mock('@evolve/data', () => ({
  createServerClient: () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  }),
}))

vi.mock('@/lib/data/network', () => ({
  resolveNetworkContext: mocks.resolveNetworkContext,
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => {} }),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/monitoring/sentry', () => ({ captureActionError: vi.fn() }))

import { grantBoardRoleAction, revokeBoardRoleAction } from './actions'

const ADMIN = { id: '11111111-1111-1111-1111-111111111111', email: 'admin@example.com' }
const TARGET = '22222222-2222-2222-2222-222222222222'

beforeEach(() => {
  mocks.getUser.mockReset()
  mocks.rpc.mockReset()
  mocks.resolveNetworkContext.mockReset()
  // Par défaut : caller authentifié + network_admin + RPC succès (log_audit_event inclus).
  mocks.getUser.mockResolvedValue({ data: { user: ADMIN } })
  mocks.resolveNetworkContext.mockResolvedValue({ role: 'network_admin', title: null })
  mocks.rpc.mockResolvedValue({ data: null, error: null })
})

describe('grantBoardRoleAction', () => {
  it('rejette un user_id non-uuid sans toucher la DB', async () => {
    const res = await grantBoardRoleAction('not-a-uuid', 'network_board', null)
    expect(res).toEqual({ ok: false, error: 'invalid' })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('rejette un rôle invalide sans toucher la DB', async () => {
    // @ts-expect-error — entrée invalide volontaire
    const res = await grantBoardRoleAction(TARGET, 'bogus', null)
    expect(res).toEqual({ ok: false, error: 'invalid' })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('rejette un titre invalide sans toucher la DB', async () => {
    // @ts-expect-error — entrée invalide volontaire
    const res = await grantBoardRoleAction(TARGET, 'network_board', 'duke')
    expect(res).toEqual({ ok: false, error: 'invalid' })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('refuse un network_board (réservé network_admin) — test négatif', async () => {
    mocks.resolveNetworkContext.mockResolvedValue({ role: 'network_board', title: 'secretary' })
    const res = await grantBoardRoleAction(TARGET, 'network_board', 'treasurer')
    expect(res).toEqual({ ok: false, error: 'forbidden' })
    // Aucun appel RPC d'écriture : le pré-check admin coupe avant.
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('refuse sans session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const res = await grantBoardRoleAction(TARGET, 'network_board', null)
    expect(res).toEqual({ ok: false, error: 'unauthorized' })
  })

  it('happy path : appelle network_grant_role et renvoie ok', async () => {
    const res = await grantBoardRoleAction(TARGET, 'network_admin', 'president')
    expect(res).toEqual({ ok: true })
    // 1er appel rpc = network_grant_role avec les bons args.
    expect(mocks.rpc).toHaveBeenCalledWith('network_grant_role', {
      p_user_id: TARGET,
      p_role: 'network_admin',
      p_title: 'president',
    })
  })

  it('titre null → p_title undefined (pas de titre forcé)', async () => {
    await grantBoardRoleAction(TARGET, 'network_board', null)
    expect(mocks.rpc).toHaveBeenCalledWith('network_grant_role', {
      p_user_id: TARGET,
      p_role: 'network_board',
      p_title: undefined,
    })
  })

  it('RPC 42501 (garde DB) → forbidden', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'refus' } })
    const res = await grantBoardRoleAction(TARGET, 'network_board', null)
    expect(res).toEqual({ ok: false, error: 'forbidden' })
  })

  it("un log d'audit en échec ne fait PAS échouer la mutation", async () => {
    // 1er rpc (network_grant_role) OK ; 2e rpc (log_audit_event via withAudit) en erreur.
    mocks.rpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: 'XX000', message: 'log down' } })
    const res = await grantBoardRoleAction(TARGET, 'network_board', null)
    expect(res).toEqual({ ok: true })
  })
})

describe('revokeBoardRoleAction', () => {
  it('rejette un user_id non-uuid', async () => {
    const res = await revokeBoardRoleAction('nope')
    expect(res).toEqual({ ok: false, error: 'invalid' })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('refuse un network_board (réservé network_admin) — test négatif', async () => {
    mocks.resolveNetworkContext.mockResolvedValue({ role: 'network_board', title: null })
    const res = await revokeBoardRoleAction(TARGET)
    expect(res).toEqual({ ok: false, error: 'forbidden' })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('happy path : appelle network_revoke_role et renvoie ok', async () => {
    const res = await revokeBoardRoleAction(TARGET)
    expect(res).toEqual({ ok: true })
    expect(mocks.rpc).toHaveBeenCalledWith('network_revoke_role', { p_user_id: TARGET })
  })

  it('garde-fou « dernier admin » : check_violation message dédié → last_admin', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: '23514', message: 'impossible de retirer le dernier administrateur réseau' },
    })
    const res = await revokeBoardRoleAction(TARGET)
    expect(res).toEqual({ ok: false, error: 'last_admin' })
  })

  it('check_violation générique (autre message) → invalid', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: '23514', message: 'autre contrainte' },
    })
    const res = await revokeBoardRoleAction(TARGET)
    expect(res).toEqual({ ok: false, error: 'invalid' })
  })
})
