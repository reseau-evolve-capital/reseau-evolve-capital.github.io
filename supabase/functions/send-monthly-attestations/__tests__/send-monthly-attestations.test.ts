// Tests Deno de l'Edge Function `send-monthly-attestations` (NTF-005).
//
// EXÉCUTION (depuis la racine du repo)
// ------------------------------------
//     deno test --allow-env \
//       --config supabase/functions/send-monthly-attestations/deno.json \
//       supabase/functions/send-monthly-attestations/__tests__/send-monthly-attestations.test.ts
//
// On importe `handler.ts` (logique pure) : aucun I/O réel, aucun rendu TSX/PDF — toutes
// les seams (listClubs, listActiveMembers, alreadySent, assemble, sendBrevo, recordSend,
// sleep) sont stubbées. `index.ts` (entrypoint prod) garde les imports lourds isolés.
//
// CE QUI EST TESTÉ
// ----------------
// 1. Idempotence par période : 2e run sur la même période → 0 envoi (tout déjà journalisé).
// 2. Skip si déjà envoyé : un membre déjà journalisé est sauté, les autres sont envoyés.
// 3. Non-arrêt sur échec : un membre qui jette n'interrompt pas le batch.
// 4. Backoff Brevo : un 429 transitoire est retenté (sleep appelé) puis réussit.
// 5. Assemblage de la pièce jointe base64 dans le payload Brevo.
// 6. Période par défaut = mois précédent (previousMonthPeriod).

import { assert, assertEquals } from 'jsr:@std/assert@^1'

import { BrevoRateLimitError, previousMonthPeriod, runAttestationBatch } from '../handler.ts'
import type { AttestationBatchDeps, BrevoEmailPayload, MemberRow } from '../handler.ts'

// ---- Fabrique de deps stubbées (en mémoire) ----
interface FakeState {
  clubs: { id: string; name: string }[]
  membersByClub: Record<string, MemberRow[]>
  /** Set des « membershipId|period » déjà journalisés. */
  sentLog: Set<string>
}

interface FakeOpts {
  /** membershipId → nombre de 429 à émettre avant succès. */
  rateLimit?: Record<string, number>
  /** membershipId qui jette une erreur dure à l'assemblage. */
  failAssemble?: Set<string>
}

function makeDeps(state: FakeState, opts: FakeOpts = {}) {
  const brevoPayloads: BrevoEmailPayload[] = []
  const recorded: { membershipId: string; period: string; messageId: string | null }[] = []
  const sleeps: number[] = []
  const rl = { ...(opts.rateLimit ?? {}) }

  const deps: AttestationBatchDeps = {
    listClubs: () => Promise.resolve(state.clubs),
    listActiveMembers: (clubId) => Promise.resolve(state.membersByClub[clubId] ?? []),
    alreadySent: (membershipId, period) =>
      Promise.resolve(state.sentLog.has(`${membershipId}|${period}`)),
    assemble: (member) => {
      if (opts.failAssemble?.has(member.membershipId)) {
        return Promise.reject(new Error(`assemblage HS pour ${member.membershipId}`))
      }
      return Promise.resolve({
        pdfBase64: btoa(`PDF-${member.membershipId}`),
        attachmentName: `attestation-detention-club-2026-04.pdf`,
        htmlContent: `<html>${member.membershipId}</html>`,
        subject: 'Ton attestation de détention de avril 2026',
      })
    },
    sendBrevo: (payload) => {
      const id = payload.to[0]?.email ?? ''
      const remaining = rl[id] ?? 0
      if (remaining > 0) {
        rl[id] = remaining - 1
        return Promise.reject(new BrevoRateLimitError())
      }
      brevoPayloads.push(payload)
      return Promise.resolve({ messageId: `msg-${brevoPayloads.length}` })
    },
    recordSend: (membershipId, period, messageId) => {
      state.sentLog.add(`${membershipId}|${period}`)
      recorded.push({ membershipId, period, messageId })
      return Promise.resolve()
    },
    sleep: (ms) => {
      sleeps.push(ms)
      return Promise.resolve()
    },
    // log silencieux en test
    log: () => {},
  }
  return { deps, brevoPayloads, recorded, sleeps }
}

function baseState(): FakeState {
  return {
    clubs: [{ id: 'c1', name: 'Cercle Arago' }],
    membersByClub: {
      c1: [
        { membershipId: 'm1', email: 'a@ex.fr', fullName: 'Awa Koné' },
        { membershipId: 'm2', email: 'b@ex.fr', fullName: 'Bob Martin' },
      ],
    },
    sentLog: new Set(),
  }
}

const PERIOD = '2026-04'

// ---- Test 1 — premier run : tout le monde reçoit + pièce jointe base64 ----
Deno.test('premier run : envoie à chaque membre actif avec pièce jointe PDF base64', async () => {
  const state = baseState()
  const { deps, brevoPayloads, recorded } = makeDeps(state)

  const summary = await runAttestationBatch(deps, { period: PERIOD })

  assertEquals(summary.sent, 2)
  assertEquals(summary.skipped, 0)
  assertEquals(summary.failed, 0)
  assertEquals(brevoPayloads.length, 2)

  // Pièce jointe base64 présente et décodable.
  const att = brevoPayloads[0].attachment[0]
  assert(att.name.endsWith('.pdf'))
  assertEquals(atob(att.content), 'PDF-m1')
  assertEquals(brevoPayloads[0].to[0].email, 'a@ex.fr')

  // Journalisé pour les deux.
  assertEquals(recorded.length, 2)
})

// ---- Test 2 — IDEMPOTENCE : 2e run même période → 0 envoi ----
Deno.test('idempotence : un 2e run sur la même période n’envoie rien', async () => {
  const state = baseState()
  const first = makeDeps(state)
  await runAttestationBatch(first.deps, { period: PERIOD })
  assertEquals(first.brevoPayloads.length, 2)

  // 2e run : sentLog est déjà rempli → tout est sauté.
  const second = makeDeps(state)
  const summary = await runAttestationBatch(second.deps, { period: PERIOD })

  assertEquals(summary.sent, 0)
  assertEquals(summary.skipped, 2)
  assertEquals(second.brevoPayloads.length, 0)
})

// ---- Test 3 — SKIP si déjà envoyé : un membre journalisé, l'autre est envoyé ----
Deno.test('skip si déjà envoyé : seul le membre non journalisé reçoit', async () => {
  const state = baseState()
  state.sentLog.add(`m1|${PERIOD}`) // m1 déjà envoyé
  const { deps, brevoPayloads } = makeDeps(state)

  const summary = await runAttestationBatch(deps, { period: PERIOD })

  assertEquals(summary.skipped, 1)
  assertEquals(summary.sent, 1)
  assertEquals(brevoPayloads.length, 1)
  assertEquals(brevoPayloads[0].to[0].email, 'b@ex.fr') // m2 uniquement
})

// ---- Test 4 — NON-ARRÊT : un membre en échec n'interrompt pas le batch ----
Deno.test('non-arrêt : l’échec d’assemblage d’un membre ne bloque pas les autres', async () => {
  const state = baseState()
  const { deps, brevoPayloads } = makeDeps(state, { failAssemble: new Set(['m1']) })

  const summary = await runAttestationBatch(deps, { period: PERIOD })

  assertEquals(summary.failed, 1) // m1
  assertEquals(summary.sent, 1) // m2 a continué
  assertEquals(brevoPayloads.length, 1)
  assertEquals(brevoPayloads[0].to[0].email, 'b@ex.fr')
})

// ---- Test 5 — BACKOFF : un 429 transitoire est retenté puis réussit ----
Deno.test('backoff : un 429 transitoire est retenté (sleep) puis l’envoi réussit', async () => {
  const state = baseState()
  // m1 reçoit 1 réponse 429 avant de réussir ; m2 réussit du premier coup.
  const { deps, brevoPayloads, sleeps } = makeDeps(state, { rateLimit: { 'a@ex.fr': 1 } })

  const summary = await runAttestationBatch(deps, { period: PERIOD })

  assertEquals(summary.sent, 2)
  assertEquals(summary.failed, 0)
  assertEquals(brevoPayloads.length, 2)
  // Le backoff a déclenché au moins un sleep (retry de m1).
  assert(sleeps.length >= 1)
  assert(sleeps[0] > 0)
})

// ---- Test 6 — BACKOFF épuisé : 429 persistant → membre en échec, batch continue ----
Deno.test(
  'backoff épuisé : un 429 persistant compte comme échec sans bloquer le batch',
  async () => {
    const state = baseState()
    const { deps, brevoPayloads } = makeDeps(state, { rateLimit: { 'a@ex.fr': 99 } }) // toujours 429

    const summary = await runAttestationBatch(deps, { period: PERIOD })

    assertEquals(summary.failed, 1) // m1 jamais passé
    assertEquals(summary.sent, 1) // m2 OK
    assertEquals(brevoPayloads.length, 1)
  }
)

// ---- Test 7 — période par défaut = mois précédent ----
Deno.test('previousMonthPeriod : calcule le mois précédent (gère janvier → décembre N-1)', () => {
  assertEquals(previousMonthPeriod(new Date(Date.UTC(2026, 4, 5))), '2026-04') // mai → avril
  assertEquals(previousMonthPeriod(new Date(Date.UTC(2026, 0, 5))), '2025-12') // janv → déc N-1
})
