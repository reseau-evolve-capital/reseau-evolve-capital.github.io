// Tests Deno du handler pur `send-poll-email` (PUSH-001 V1 email ; spec §7, §12).
//
// EXÉCUTION (depuis la racine du repo)
// ------------------------------------
//     deno test --no-check --allow-all \
//       --config supabase/functions/send-poll-email/deno.json \
//       supabase/functions/send-poll-email/__tests__/
//
// On importe `handler.ts` (logique pure) : aucun I/O réel, aucun rendu React Email — toutes
// les seams (getPoll, getClubName, listClubActiveMembers, listUsersWhoVoted, alreadySent,
// recordSent, renderHtml, sendBrevo, sleep) sont stubbées en mémoire.
//
// CE QUI EST TESTÉ
// ----------------
// 1. ANTI-CROSS-CLUB (critique) : deux clubs A/B, poll dans A → SEULS les membres de A
//    sont emailés ; aucun membre de B ne reçoit.
// 2. Idempotence : 2e appel (poll_id, variant) → skip (skipped = N, 0 envoi).
// 3. Rappel : exclut les membres ayant déjà voté.
// 4. Destinataires normalisés : un membre sans email est skippé.
// 5. recordSent : marque l'envoi après succès, avec le compteur.

import { assert, assertEquals } from 'jsr:@std/assert@^1'

import { runPollEmail } from '../handler.ts'
import type {
  BrevoPollEmailPayload,
  PollEmailDeps,
  PollEmailVariant,
  PollMember,
  PollRow,
} from '../handler.ts'

interface FakeState {
  polls: Record<string, PollRow>
  clubNames: Record<string, string>
  membersByClub: Record<string, PollMember[]>
  voted: Record<string, string[]>
  /** Set des « pollId|variant » déjà envoyés. */
  sentLog: Set<string>
}

function makeDeps(state: FakeState) {
  const brevoPayloads: BrevoPollEmailPayload[] = []
  const recorded: { pollId: string; variant: PollEmailVariant; count: number }[] = []

  const deps: PollEmailDeps = {
    getPoll: (pollId) => Promise.resolve(state.polls[pollId] ?? null),
    getClubName: (clubId) => Promise.resolve(state.clubNames[clubId] ?? ''),
    listClubActiveMembers: (clubId) => Promise.resolve(state.membersByClub[clubId] ?? []),
    listUsersWhoVoted: (pollId) => Promise.resolve(state.voted[pollId] ?? []),
    alreadySent: (pollId, variant) => Promise.resolve(state.sentLog.has(`${pollId}|${variant}`)),
    recordSent: (pollId, variant, count) => {
      state.sentLog.add(`${pollId}|${variant}`)
      recorded.push({ pollId, variant, count })
      return Promise.resolve()
    },
    renderHtml: (props) =>
      Promise.resolve(`<html>${props.variant}:${props.pollTitle}:${props.memberFirstName}</html>`),
    sendBrevo: (payload) => {
      brevoPayloads.push(payload)
      return Promise.resolve({ messageId: `msg-${brevoPayloads.length}` })
    },
    sleep: () => Promise.resolve(),
    appUrl: 'https://app.evolve.capital',
    log: () => {},
  }
  return { deps, brevoPayloads, recorded }
}

function poll(id: string, clubId: string): PollRow {
  return {
    id,
    clubId,
    title: `Vote ${id}`,
    description: null,
    questionType: 'yes_no',
    closesAt: '2026-07-01T00:00:00.000Z',
    resultsVisibility: 'after_close',
    notifyByEmail: true,
  }
}

function member(userId: string, email: string, fullName: string | null = null): PollMember {
  return { userId, email, fullName }
}

// ════════════════════════════════════════════════════════════════════════════
// 1 — ANTI-CROSS-CLUB : poll dans club A → SEULS les membres de A reçoivent.
// ════════════════════════════════════════════════════════════════════════════
Deno.test('anti-cross-club : poll du club A → seuls les membres de A sont emailés', async () => {
  const state: FakeState = {
    polls: { p1: poll('p1', 'clubA') },
    clubNames: { clubA: 'Cercle Arago', clubB: 'Cercle Borel' },
    membersByClub: {
      clubA: [member('uA1', 'a1@ex.fr', 'Awa Koné'), member('uA2', 'a2@ex.fr', 'Bo Ba')],
      clubB: [member('uB1', 'b1@ex.fr'), member('uB2', 'b2@ex.fr')], // NE DOIVENT PAS recevoir
    },
    voted: {},
    sentLog: new Set(),
  }
  const { deps, brevoPayloads } = makeDeps(state)

  const summary = await runPollEmail(deps, { pollId: 'p1', variant: 'opened' })

  assertEquals(summary.sent, 2)
  const emails = brevoPayloads.map((p) => p.to[0].email).sort()
  assertEquals(emails, ['a1@ex.fr', 'a2@ex.fr'])
  // Aucun email du club B.
  assert(!emails.includes('b1@ex.fr'))
  assert(!emails.includes('b2@ex.fr'))
})

// ════════════════════════════════════════════════════════════════════════════
// 2 — Idempotence : 2e appel (poll_id, variant) → skip total.
// ════════════════════════════════════════════════════════════════════════════
Deno.test("idempotence : un 2e appel sur (poll, variant) n'envoie rien", async () => {
  const state: FakeState = {
    polls: { p1: poll('p1', 'clubA') },
    clubNames: { clubA: 'Cercle Arago' },
    membersByClub: { clubA: [member('uA1', 'a1@ex.fr'), member('uA2', 'a2@ex.fr')] },
    voted: {},
    sentLog: new Set(),
  }
  const first = makeDeps(state)
  const s1 = await runPollEmail(first.deps, { pollId: 'p1', variant: 'opened' })
  assertEquals(s1.sent, 2)

  // 2e appel : sentLog déjà rempli → skip.
  const second = makeDeps(state)
  const s2 = await runPollEmail(second.deps, { pollId: 'p1', variant: 'opened' })
  assertEquals(s2.sent, 0)
  assertEquals(s2.skipped, 2)
  assertEquals(second.brevoPayloads.length, 0)
})

// ════════════════════════════════════════════════════════════════════════════
// 3 — Rappel : exclut les membres ayant déjà voté.
// ════════════════════════════════════════════════════════════════════════════
Deno.test('reminder : exclut les membres ayant déjà voté', async () => {
  const state: FakeState = {
    polls: { p1: poll('p1', 'clubA') },
    clubNames: { clubA: 'Cercle Arago' },
    membersByClub: {
      clubA: [member('uA1', 'a1@ex.fr'), member('uA2', 'a2@ex.fr'), member('uA3', 'a3@ex.fr')],
    },
    voted: { p1: ['uA2'] }, // uA2 a voté → exclu du rappel
    sentLog: new Set(),
  }
  const { deps, brevoPayloads } = makeDeps(state)

  const summary = await runPollEmail(deps, { pollId: 'p1', variant: 'reminder' })

  assertEquals(summary.sent, 2)
  const emails = brevoPayloads.map((p) => p.to[0].email).sort()
  assertEquals(emails, ['a1@ex.fr', 'a3@ex.fr'])
  assert(!emails.includes('a2@ex.fr'))
})

// ════════════════════════════════════════════════════════════════════════════
// 4 — Destinataires normalisés : un membre sans email est skippé.
// ════════════════════════════════════════════════════════════════════════════
Deno.test('normalisation : un membre sans email est skippé, les autres reçoivent', async () => {
  const state: FakeState = {
    polls: { p1: poll('p1', 'clubA') },
    clubNames: { clubA: 'Cercle Arago' },
    membersByClub: {
      clubA: [member('uA1', 'a1@ex.fr'), member('uA2', '   '), member('uA3', '')],
    },
    voted: {},
    sentLog: new Set(),
  }
  const { deps, brevoPayloads } = makeDeps(state)

  const summary = await runPollEmail(deps, { pollId: 'p1', variant: 'closed' })

  assertEquals(summary.sent, 1)
  assertEquals(summary.skipped, 2)
  assertEquals(
    brevoPayloads.map((p) => p.to[0].email),
    ['a1@ex.fr']
  )
})

// ════════════════════════════════════════════════════════════════════════════
// 5 — recordSent : marque l'envoi après succès avec le compteur.
// ════════════════════════════════════════════════════════════════════════════
Deno.test('recordSent : marque (poll, variant, count) après envoi réussi', async () => {
  const state: FakeState = {
    polls: { p1: poll('p1', 'clubA') },
    clubNames: { clubA: 'Cercle Arago' },
    membersByClub: { clubA: [member('uA1', 'a1@ex.fr'), member('uA2', 'a2@ex.fr')] },
    voted: {},
    sentLog: new Set(),
  }
  const { deps, recorded } = makeDeps(state)

  await runPollEmail(deps, { pollId: 'p1', variant: 'opened' })

  assertEquals(recorded.length, 1)
  assertEquals(recorded[0].pollId, 'p1')
  assertEquals(recorded[0].variant, 'opened')
  assertEquals(recorded[0].count, 2)
})

// ════════════════════════════════════════════════════════════════════════════
// 6 — Poll introuvable : retourne summary vide sans crash.
// ════════════════════════════════════════════════════════════════════════════
Deno.test('poll introuvable : 0 envoi, pas de crash', async () => {
  const state: FakeState = {
    polls: {},
    clubNames: {},
    membersByClub: {},
    voted: {},
    sentLog: new Set(),
  }
  const { deps, brevoPayloads } = makeDeps(state)

  const summary = await runPollEmail(deps, { pollId: 'unknown', variant: 'opened' })

  assertEquals(summary.sent, 0)
  assertEquals(summary.failed, 0)
  assertEquals(brevoPayloads.length, 0)
})
