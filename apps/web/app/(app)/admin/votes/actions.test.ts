// Tests des Server Actions du module Vote — volet INTÉGRATION notifications (spec §8).
//
// Couvre le câblage push + email à la publication / clôture d'un vote :
//   (1) publish + notifyByEmail=true → dispatchNotification('poll.opened', clubId du vote) UNE
//       fois + invoke('send-poll-email', { poll_id, variant:'opened' }) ;
//   (2) publish + notifyByEmail=false → AUCUN dispatch, AUCUN email ;
//   (3) draft (même notifyByEmail=true) → AUCUN dispatch (status ≠ 'open') ;
//   (4) close → dispatchNotification('poll.closed', clubId du vote) ;
//   (5) FIRE-AND-FORGET : dispatch qui throw / client service-role qui throw → l'action retourne
//       quand même { ok:true } (la notif n'échoue jamais la publication) ;
//   (6) ANTI-CROSS-CLUB : l'event.clubId vaut TOUJOURS le club résolu du vote, jamais un autre
//       (pas de broadcast plus large).
//
// On mocke @evolve/data (createServerClient, createServiceRoleClient, dispatchNotification),
// next/headers (cookies) et @/lib/data/admin (resolveAdminContext). Le client session expose
// auth.getUser + from('polls').insert/update/select ; le client service-role n'expose que
// functions.invoke (push résolu côté Edge, jamais en service-role browser).

import { describe, it, expect, vi, beforeEach } from 'vitest'

const CLUB = 'club-evolve-001'
const OTHER_CLUB = 'club-autre-999'
const USER = { id: 'user-staff-1' }
const POLL_ID = 'poll-abc-123'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  // polls table
  insertSingle: vi.fn(),
  updateResult: vi.fn(),
  selectSingle: vi.fn(),
  // notifications
  dispatchNotification: vi.fn(),
  createServiceRoleClient: vi.fn(),
  invoke: vi.fn(),
  resolveAdminContext: vi.fn(),
}))

// Builder de requête `polls` minimal et chaînable. insert().select().single() pour la création ;
// update().eq().eq().eq() (thenable) pour la clôture ; select().eq().eq().single() pour relire le
// titre. Chaque terminal lit le mock dédié.
function makePollsQuery() {
  const updateChain = {
    eq: vi.fn(),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(mocks.updateResult()).then(resolve),
  }
  updateChain.eq.mockReturnValue(updateChain)

  const selectChain = {
    eq: vi.fn(),
    single: () => mocks.selectSingle(),
  }
  selectChain.eq.mockReturnValue(selectChain)

  return {
    insert: () => ({
      select: () => ({ single: () => mocks.insertSingle() }),
    }),
    update: () => updateChain,
    select: () => selectChain,
  }
}

vi.mock('@evolve/data', () => ({
  createServerClient: () => ({
    auth: { getUser: mocks.getUser },
    from: () => makePollsQuery(),
  }),
  createServiceRoleClient: () => mocks.createServiceRoleClient(),
  dispatchNotification: (...args: unknown[]) => mocks.dispatchNotification(...args),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => {} }),
}))

vi.mock('@/lib/data/admin', () => ({
  resolveAdminContext: (...args: unknown[]) => mocks.resolveAdminContext(...args),
}))

// withAudit : passthrough qui EXÉCUTE l'action et ignore la journalisation (testée à part dans
// lib/actions/withAudit.test.ts). Garantit l'hermétisme : pas d'appel RPC log_audit_event ici.
vi.mock('@/lib/actions/withAudit', () => ({
  withAudit:
    (fn: (...a: unknown[]) => unknown) =>
    (...a: unknown[]) =>
      fn(...a),
}))

import { createPollAction, closePollAction } from './actions'

type CreatePayload = {
  title: string
  description: string
  questionType: 'yes_no' | 'single_choice' | 'multiple_choice' | 'short_text'
  options: string[]
  resultsVisibility: 'after_close' | 'live'
  notifyByEmail: boolean
  closesAt: string | null
}

function makePayload(over: Partial<CreatePayload> = {}): CreatePayload {
  return {
    title: 'Approuvez-vous le budget 2026 ?',
    description: '',
    questionType: 'yes_no',
    options: [],
    resultsVisibility: 'after_close',
    notifyByEmail: true,
    closesAt: null,
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Suppression du bruit console.error (les helpers loggent les échecs avalés).
  vi.spyOn(console, 'error').mockImplementation(() => {})

  mocks.getUser.mockResolvedValue({ data: { user: USER } })
  mocks.resolveAdminContext.mockResolvedValue({ userId: USER.id, clubId: CLUB, role: 'president' })
  mocks.insertSingle.mockResolvedValue({ data: { id: POLL_ID }, error: null })
  mocks.updateResult.mockReturnValue({ error: null })
  mocks.selectSingle.mockResolvedValue({
    data: { title: 'Approuvez-vous le budget 2026 ?' },
    error: null,
  })
  mocks.dispatchNotification.mockResolvedValue({ sent: 1, failed: 0, skipped: 0 })
  mocks.invoke.mockResolvedValue({ data: { queued: 1 }, error: null })
  // Client service-role : seul functions.invoke est exposé.
  mocks.createServiceRoleClient.mockReturnValue({ functions: { invoke: mocks.invoke } })
})

describe('createPollAction — notifications', () => {
  it('publish + notifyByEmail=true → dispatch poll.opened (clubId du vote) + email opened', async () => {
    const res = await createPollAction(makePayload({ notifyByEmail: true }), 'publish')

    expect(res).toEqual({ ok: true, pollId: POLL_ID })

    expect(mocks.dispatchNotification).toHaveBeenCalledTimes(1)
    const [adminArg, event] = mocks.dispatchNotification.mock.calls[0]!
    expect(adminArg).toBe(mocks.createServiceRoleClient.mock.results[0]!.value)
    expect(event).toMatchObject({
      type: 'poll.opened',
      clubId: CLUB,
      payload: { pollId: POLL_ID, title: 'Approuvez-vous le budget 2026 ?' },
    })

    expect(mocks.invoke).toHaveBeenCalledTimes(1)
    expect(mocks.invoke).toHaveBeenCalledWith('send-poll-email', {
      body: { poll_id: POLL_ID, variant: 'opened' },
    })
  })

  it('transmet closesAt (ISO fin de journée) dans le payload poll.opened', async () => {
    await createPollAction(makePayload({ closesAt: '2026-07-01' }), 'publish')
    const [, event] = mocks.dispatchNotification.mock.calls[0]!
    expect(event.payload.closesAt).toMatch(/^2026-07-01T/)
  })

  it('publish + notifyByEmail=false → AUCUN dispatch, AUCUN email', async () => {
    const res = await createPollAction(makePayload({ notifyByEmail: false }), 'publish')

    expect(res).toEqual({ ok: true, pollId: POLL_ID })
    expect(mocks.dispatchNotification).not.toHaveBeenCalled()
    expect(mocks.invoke).not.toHaveBeenCalled()
    // Pas même de tentative de création du client service-role.
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it('draft (action=draft) + notifyByEmail=true → AUCUN dispatch (status ≠ open)', async () => {
    const res = await createPollAction(makePayload({ notifyByEmail: true }), 'draft')

    expect(res).toEqual({ ok: true, pollId: POLL_ID })
    expect(mocks.dispatchNotification).not.toHaveBeenCalled()
    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  it('ANTI-CROSS-CLUB : l’event.clubId = club résolu du vote, jamais un autre club', async () => {
    // Le ctx résolu pointe sur CLUB ; même si un autre club existe, on ne diffuse qu’au club du vote.
    await createPollAction(makePayload({ notifyByEmail: true }), 'publish')

    const [, event] = mocks.dispatchNotification.mock.calls[0]!
    expect(event.clubId).toBe(CLUB)
    expect(event.clubId).not.toBe(OTHER_CLUB)
    // Aucun appel de dispatch ne cible un autre club.
    for (const call of mocks.dispatchNotification.mock.calls) {
      expect(call[1].clubId).toBe(CLUB)
    }
  })

  it('FIRE-AND-FORGET : dispatchNotification qui throw → action retourne quand même { ok:true }', async () => {
    mocks.dispatchNotification.mockRejectedValue(new Error('Edge down'))

    const res = await createPollAction(makePayload({ notifyByEmail: true }), 'publish')
    expect(res).toEqual({ ok: true, pollId: POLL_ID })
  })

  it('FIRE-AND-FORGET : client service-role qui throw (clé absente) → action retourne { ok:true }', async () => {
    mocks.createServiceRoleClient.mockImplementation(() => {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante')
    })

    const res = await createPollAction(makePayload({ notifyByEmail: true }), 'publish')
    expect(res).toEqual({ ok: true, pollId: POLL_ID })
    // Service-role indisponible → ni push ni email.
    expect(mocks.dispatchNotification).not.toHaveBeenCalled()
    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  it('FIRE-AND-FORGET : email invoke qui throw → action retourne quand même { ok:true }', async () => {
    mocks.invoke.mockRejectedValue(new Error('send-poll-email KO'))

    const res = await createPollAction(makePayload({ notifyByEmail: true }), 'publish')
    expect(res).toEqual({ ok: true, pollId: POLL_ID })
    // Le push a quand même été tenté avant l’email.
    expect(mocks.dispatchNotification).toHaveBeenCalledTimes(1)
  })

  it('insert en erreur → pas de notification (la publication a échoué)', async () => {
    mocks.insertSingle.mockResolvedValue({ data: null, error: { code: '42501' } })

    const res = await createPollAction(makePayload({ notifyByEmail: true }), 'publish')
    expect(res).toEqual({ ok: false, error: 'forbidden' })
    expect(mocks.dispatchNotification).not.toHaveBeenCalled()
    expect(mocks.invoke).not.toHaveBeenCalled()
  })
})

describe('closePollAction — notifications', () => {
  it('close → dispatch poll.closed (clubId du vote) avec le titre relu', async () => {
    const res = await closePollAction(POLL_ID)

    expect(res).toEqual({ ok: true })
    expect(mocks.dispatchNotification).toHaveBeenCalledTimes(1)
    const [adminArg, event] = mocks.dispatchNotification.mock.calls[0]!
    expect(adminArg).toBe(mocks.createServiceRoleClient.mock.results[0]!.value)
    expect(event).toMatchObject({
      type: 'poll.closed',
      clubId: CLUB,
      payload: { pollId: POLL_ID, title: 'Approuvez-vous le budget 2026 ?' },
    })
    // Pas d’email à la clôture en V0.
    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  it('ANTI-CROSS-CLUB : l’event.clubId de clôture = club du vote, jamais un autre', async () => {
    await closePollAction(POLL_ID)
    const [, event] = mocks.dispatchNotification.mock.calls[0]!
    expect(event.clubId).toBe(CLUB)
    expect(event.clubId).not.toBe(OTHER_CLUB)
  })

  it('FIRE-AND-FORGET : dispatch poll.closed qui throw → action retourne { ok:true }', async () => {
    mocks.dispatchNotification.mockRejectedValue(new Error('Edge down'))

    const res = await closePollAction(POLL_ID)
    expect(res).toEqual({ ok: true })
  })

  it('update en erreur → pas de notification (la clôture a échoué)', async () => {
    mocks.updateResult.mockReturnValue({ error: { code: '42501' } })

    const res = await closePollAction(POLL_ID)
    expect(res).toEqual({ ok: false, error: 'forbidden' })
    expect(mocks.dispatchNotification).not.toHaveBeenCalled()
  })
})
