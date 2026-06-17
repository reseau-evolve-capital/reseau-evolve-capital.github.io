// Tests Deno du handler pur `dispatch-push` (PUSH-001 ; spec §7).
//
// EXÉCUTION (depuis la racine du repo)
// ------------------------------------
//     deno test --no-check --allow-all \
//       --config supabase/functions/dispatch-push/deno.json \
//       supabase/functions/dispatch-push/__tests__/
//
// On importe `handler.ts` (logique pure) : aucun I/O réel, aucun web-push — toutes les seams
// (listClubActiveMemberUserIds, listSubscriptions, getPollNotifyFlag, listUsersWhoVoted,
// sendWebPush, deleteSubscription, buildContent, logDelivery) sont stubbées en mémoire.
//
// CE QUI EST TESTÉ
// ----------------
// 1. ANTI-CROSS-CLUB (critique §2.2/§7.3) : deux clubs A/B → dispatcher clubId=A ne touche
//    QUE les users du club A ; aucune subscription du club B ne reçoit.
// 2. ANTI-CROSS-CLUB défense-en-profondeur : même si listSubscriptions « fuite » une sub
//    d'un user hors-club, le handler ne l'envoie pas (filtre allowedUsers).
// 3. Filtre préférences : enabled=false → skipped ; poll_opened=false → skipped sur poll.opened.
// 4. Gate poll.opened : notify_by_email=false → 0 envoi (skipped = N).
// 5. Rappel : exclut les users ayant déjà voté.
// 6. Purge 410 : une subscription 410 Gone est supprimée et comptée failed.
// 7. Payload : title/body/url/tag uniquement — AUCUNE PII (pas d'email/user_id).

import { assert, assertEquals } from 'jsr:@std/assert@^1'

import { dispatchPush } from '../handler.ts'
import type {
  DispatchDeps,
  NotificationContent,
  NotificationEvent,
  PushSubscriptionRow,
  SubscriptionWithPrefs,
  WebPushResult,
} from '../handler.ts'

// ---- Fabrique de deps stubbées (en mémoire) ----

interface FakeState {
  /** clubId → user_id des membres actifs. */
  membersByClub: Record<string, string[]>
  /** Subscriptions (avec préférences) par endpoint. */
  subs: SubscriptionWithPrefs[]
  /** pollId → notify_by_email. */
  notifyFlag: Record<string, boolean>
  /** pollId → user_id ayant voté. */
  voted: Record<string, string[]>
}

interface Recorder {
  sentPayloads: { endpoint: string; payloadJson: string }[]
  deleted: string[]
  logged: {
    event_type: string
    club_id: string
    poll_id: string | null
    sent: number
    failed: number
    skipped: number
  }[]
}

/** Contenu déterministe et sans PII (miroir de buildNotificationContent). */
function fakeBuildContent(event: NotificationEvent): NotificationContent {
  const t = event.payload.title
  switch (event.type) {
    case 'poll.opened':
      return {
        title: 'Nouveau vote',
        body: `Nouveau vote : ${t}`,
        url: event.payload.pollId ? `/votes/${event.payload.pollId}` : '/dashboard',
        tag: `poll-opened-${event.payload.pollId ?? ''}`,
      }
    case 'poll.closed':
      return {
        title: 'Résultats du vote',
        body: `Résultats disponibles : ${t}`,
        url: event.payload.pollId ? `/votes/${event.payload.pollId}` : '/dashboard',
        tag: `poll-closed-${event.payload.pollId ?? ''}`,
      }
    case 'poll.reminder':
      return {
        title: 'Dernière chance de voter',
        body: `Il vous reste 24 h pour voter : ${t}`,
        url: event.payload.pollId ? `/votes/${event.payload.pollId}` : '/dashboard',
        tag: `poll-reminder-${event.payload.pollId ?? ''}`,
      }
    case 'system.test':
      return {
        title: 'Evolve Capital',
        body: 'Notification de test',
        url: '/dashboard',
        tag: 'system-test',
      }
  }
}

function makeDeps(
  state: FakeState,
  opts: { failStatus?: Record<string, number>; allowlistUserIds?: string[] } = {}
): { deps: DispatchDeps; rec: Recorder } {
  const rec: Recorder = { sentPayloads: [], deleted: [], logged: [] }

  const deps: DispatchDeps = {
    allowlistUserIds: opts.allowlistUserIds,
    listClubActiveMemberUserIds: (clubId) => Promise.resolve(state.membersByClub[clubId] ?? []),
    listSubscriptions: (userIds) => {
      const set = new Set(userIds)
      return Promise.resolve(state.subs.filter((s) => set.has(s.userId)))
    },
    getPollNotifyFlag: (pollId) => Promise.resolve(state.notifyFlag[pollId] ?? null),
    listUsersWhoVoted: (pollId) => Promise.resolve(state.voted[pollId] ?? []),
    sendWebPush: (sub: PushSubscriptionRow, payloadJson): Promise<WebPushResult> => {
      const status = opts.failStatus?.[sub.endpoint]
      if (status) return Promise.resolve({ ok: false, statusCode: status })
      rec.sentPayloads.push({ endpoint: sub.endpoint, payloadJson })
      return Promise.resolve({ ok: true })
    },
    deleteSubscription: (endpoint) => {
      rec.deleted.push(endpoint)
      return Promise.resolve()
    },
    buildContent: fakeBuildContent,
    logDelivery: (entry) => {
      rec.logged.push(entry)
      return Promise.resolve()
    },
    log: () => {},
  }
  return { deps, rec }
}

/** Subscription d'un user, toutes préférences ON par défaut. */
function sub(
  userId: string,
  endpoint: string,
  prefs: Partial<Omit<SubscriptionWithPrefs, 'userId' | 'endpoint' | 'p256dh' | 'auth'>> = {}
): SubscriptionWithPrefs {
  return {
    userId,
    endpoint,
    p256dh: `p256-${endpoint}`,
    auth: `auth-${endpoint}`,
    enabled: true,
    pollOpened: true,
    pollClosed: true,
    pollReminder: true,
    ...prefs,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 1 — ANTI-CROSS-CLUB : dispatcher club A ne touche QUE les users du club A.
// ════════════════════════════════════════════════════════════════════════════
Deno.test("anti-cross-club : dispatcher club A ne pousse QU'aux subs du club A", async () => {
  const state: FakeState = {
    membersByClub: {
      clubA: ['uA1', 'uA2'],
      clubB: ['uB1', 'uB2'],
    },
    subs: [
      sub('uA1', 'epA1'),
      sub('uA2', 'epA2'),
      sub('uB1', 'epB1'), // club B — NE DOIT JAMAIS recevoir
      sub('uB2', 'epB2'),
    ],
    notifyFlag: { p1: true },
    voted: {},
  }
  const { deps, rec } = makeDeps(state)

  const event: NotificationEvent = {
    type: 'poll.opened',
    clubId: 'clubA',
    payload: { pollId: 'p1', title: 'Budget 2026' },
  }
  const summary = await dispatchPush(deps, event)

  assertEquals(summary.sent, 2)
  assertEquals(summary.failed, 0)
  // Seuls les endpoints du club A ont reçu.
  const reached = rec.sentPayloads.map((p) => p.endpoint).sort()
  assertEquals(reached, ['epA1', 'epA2'])
  // Aucune subscription du club B n'a été touchée.
  assert(!reached.includes('epB1'))
  assert(!reached.includes('epB2'))
})

// ════════════════════════════════════════════════════════════════════════════
// 2 — ANTI-CROSS-CLUB défense en profondeur : si listSubscriptions « fuit » une sub
//     hors-club, le handler la filtre quand même (allowedUsers).
// ════════════════════════════════════════════════════════════════════════════
Deno.test('anti-cross-club : une sub hors-club fuitée par la requête est filtrée', async () => {
  const state: FakeState = {
    membersByClub: { clubA: ['uA1'] },
    subs: [sub('uA1', 'epA1')],
    notifyFlag: { p1: true },
    voted: {},
  }
  // deps qui « fuit » volontairement une sub d'un user hors-club.
  const { deps, rec } = makeDeps(state)
  const leaky: DispatchDeps = {
    ...deps,
    listSubscriptions: () => Promise.resolve([sub('uA1', 'epA1'), sub('uB1', 'epB1')]),
  }

  const summary = await dispatchPush(leaky, {
    type: 'poll.opened',
    clubId: 'clubA',
    payload: { pollId: 'p1', title: 'X' },
  })

  assertEquals(summary.sent, 1)
  assertEquals(
    rec.sentPayloads.map((p) => p.endpoint),
    ['epA1']
  )
  // La sub du club B fuitée n'a jamais reçu.
  assert(!rec.sentPayloads.some((p) => p.endpoint === 'epB1'))
})

// ════════════════════════════════════════════════════════════════════════════
// 3 — Filtre préférences : enabled=false → skipped ; poll_opened=false → skipped.
// ════════════════════════════════════════════════════════════════════════════
Deno.test("préférences : enabled=false et poll_opened=false → skipped (pas d'envoi)", async () => {
  const state: FakeState = {
    membersByClub: { clubA: ['u1', 'u2', 'u3'] },
    subs: [
      sub('u1', 'ep1'), // tout ON → reçoit
      sub('u2', 'ep2', { enabled: false }), // master off → skip
      sub('u3', 'ep3', { pollOpened: false }), // type off → skip
    ],
    notifyFlag: { p1: true },
    voted: {},
  }
  const { deps, rec } = makeDeps(state)

  const summary = await dispatchPush(deps, {
    type: 'poll.opened',
    clubId: 'clubA',
    payload: { pollId: 'p1', title: 'X' },
  })

  assertEquals(summary.sent, 1)
  assertEquals(summary.skipped, 2)
  assertEquals(
    rec.sentPayloads.map((p) => p.endpoint),
    ['ep1']
  )
})

// ════════════════════════════════════════════════════════════════════════════
// 4 — Gate poll.opened : notify_by_email=false → 0 envoi (skipped = N membres).
// ════════════════════════════════════════════════════════════════════════════
Deno.test('poll.opened : notify_by_email=false → aucun envoi, skipped = nb membres', async () => {
  const state: FakeState = {
    membersByClub: { clubA: ['u1', 'u2'] },
    subs: [sub('u1', 'ep1'), sub('u2', 'ep2')],
    notifyFlag: { p1: false }, // staff n'a PAS demandé la notif
    voted: {},
  }
  const { deps, rec } = makeDeps(state)

  const summary = await dispatchPush(deps, {
    type: 'poll.opened',
    clubId: 'clubA',
    payload: { pollId: 'p1', title: 'X' },
  })

  assertEquals(summary.sent, 0)
  assertEquals(summary.skipped, 2)
  assertEquals(rec.sentPayloads.length, 0)
})

// ════════════════════════════════════════════════════════════════════════════
// 5 — Rappel : exclut les users ayant déjà voté.
// ════════════════════════════════════════════════════════════════════════════
Deno.test('poll.reminder : exclut les membres ayant déjà voté', async () => {
  const state: FakeState = {
    membersByClub: { clubA: ['u1', 'u2', 'u3'] },
    subs: [sub('u1', 'ep1'), sub('u2', 'ep2'), sub('u3', 'ep3')],
    notifyFlag: {},
    voted: { p1: ['u2'] }, // u2 a déjà voté → exclu du rappel
  }
  const { deps, rec } = makeDeps(state)

  const summary = await dispatchPush(deps, {
    type: 'poll.reminder',
    clubId: 'clubA',
    payload: { pollId: 'p1', title: 'X' },
  })

  assertEquals(summary.sent, 2)
  const reached = rec.sentPayloads.map((p) => p.endpoint).sort()
  assertEquals(reached, ['ep1', 'ep3'])
  assert(!reached.includes('ep2'))
})

// ════════════════════════════════════════════════════════════════════════════
// 6 — Purge 410 : une subscription 410 Gone est supprimée et comptée failed.
// ════════════════════════════════════════════════════════════════════════════
Deno.test('410 Gone : la subscription est purgée et comptée en failed', async () => {
  const state: FakeState = {
    membersByClub: { clubA: ['u1', 'u2'] },
    subs: [sub('u1', 'ep1'), sub('u2', 'epDead')],
    notifyFlag: { p1: true },
    voted: {},
  }
  const { deps, rec } = makeDeps(state, { failStatus: { epDead: 410 } })

  const summary = await dispatchPush(deps, {
    type: 'poll.opened',
    clubId: 'clubA',
    payload: { pollId: 'p1', title: 'X' },
  })

  assertEquals(summary.sent, 1)
  assertEquals(summary.failed, 1)
  assertEquals(rec.deleted, ['epDead'])
})

// ════════════════════════════════════════════════════════════════════════════
// 7 — Payload sans PII : title/body/url/tag uniquement (pas d'email/user_id).
// ════════════════════════════════════════════════════════════════════════════
Deno.test('payload : title/body/url/tag uniquement — aucune PII', async () => {
  const state: FakeState = {
    membersByClub: { clubA: ['u1'] },
    subs: [sub('u1', 'ep1')],
    notifyFlag: { p1: true },
    voted: {},
  }
  const { deps, rec } = makeDeps(state)

  await dispatchPush(deps, {
    type: 'poll.opened',
    clubId: 'clubA',
    payload: { pollId: 'p1', title: 'Budget' },
  })

  assertEquals(rec.sentPayloads.length, 1)
  const parsed = JSON.parse(rec.sentPayloads[0].payloadJson) as Record<string, unknown>
  // Clés autorisées uniquement.
  assertEquals(Object.keys(parsed).sort(), ['body', 'tag', 'title', 'url'])
  const raw = rec.sentPayloads[0].payloadJson
  // Aucun marqueur de PII.
  assert(!raw.includes('@'), "pas d'email dans le payload")
  assert(!raw.includes('u1'), 'pas de user_id dans le payload')
  assert(!raw.includes('user_id'), 'pas de clé user_id')
})

// ════════════════════════════════════════════════════════════════════════════
// 8 — Journal agrégé : logDelivery reçoit les compteurs (sans PII).
// ════════════════════════════════════════════════════════════════════════════
Deno.test('logDelivery : journalise un résumé agrégé sans PII', async () => {
  const state: FakeState = {
    membersByClub: { clubA: ['u1', 'u2'] },
    subs: [sub('u1', 'ep1'), sub('u2', 'ep2', { enabled: false })],
    notifyFlag: { p1: true },
    voted: {},
  }
  const { deps, rec } = makeDeps(state)

  await dispatchPush(deps, {
    type: 'poll.opened',
    clubId: 'clubA',
    payload: { pollId: 'p1', title: 'X' },
  })

  assertEquals(rec.logged.length, 1)
  const entry = rec.logged[0]
  assertEquals(entry.event_type, 'poll.opened')
  assertEquals(entry.club_id, 'clubA')
  assertEquals(entry.poll_id, 'p1')
  assertEquals(entry.sent, 1)
  assertEquals(entry.skipped, 1)
  // Pas de champ destinataire individuel.
  assert(!('user_id' in entry))
  assert(!('email' in entry))
})

// ════════════════════════════════════════════════════════════════════════════
// 9 — ALLOWLIST DE TEST (NOTIFY_ALLOWLIST → user_id) — sûreté du mode test.
// ════════════════════════════════════════════════════════════════════════════
Deno.test('allowlist VIDE → comportement normal : tous les membres du club reçoivent', async () => {
  const state: FakeState = {
    membersByClub: { clubA: ['uA1', 'uA2'] },
    subs: [sub('uA1', 'epA1'), sub('uA2', 'epA2')],
    notifyFlag: { p1: true },
    voted: {},
  }
  const { deps, rec } = makeDeps(state, { allowlistUserIds: [] })
  const summary = await dispatchPush(deps, {
    type: 'poll.opened',
    clubId: 'clubA',
    payload: { pollId: 'p1', title: 'X' },
  })
  assertEquals(summary.sent, 2)
  assertEquals(rec.sentPayloads.map((p) => p.endpoint).sort(), ['epA1', 'epA2'])
})

Deno.test('allowlist = [uA1] → SEUL uA1 reçoit (les autres membres du club exclus)', async () => {
  const state: FakeState = {
    membersByClub: { clubA: ['uA1', 'uA2', 'uA3'] },
    subs: [sub('uA1', 'epA1'), sub('uA2', 'epA2'), sub('uA3', 'epA3')],
    notifyFlag: { p1: true },
    voted: {},
  }
  const { deps, rec } = makeDeps(state, { allowlistUserIds: ['uA1'] })
  const summary = await dispatchPush(deps, {
    type: 'poll.opened',
    clubId: 'clubA',
    payload: { pollId: 'p1', title: 'X' },
  })
  assertEquals(summary.sent, 1)
  assertEquals(
    rec.sentPayloads.map((p) => p.endpoint),
    ['epA1']
  )
})

Deno.test(
  'SÛRETÉ : allowlist = user HORS club → personne ne reçoit (intersection, jamais additif)',
  async () => {
    const state: FakeState = {
      membersByClub: { clubA: ['uA1', 'uA2'] },
      // La sub de l'étranger existe, mais il n'est pas membre du club A.
      subs: [sub('uA1', 'epA1'), sub('uA2', 'epA2'), sub('uX', 'epX')],
      notifyFlag: { p1: true },
      voted: {},
    }
    const { deps, rec } = makeDeps(state, { allowlistUserIds: ['uX'] })
    const summary = await dispatchPush(deps, {
      type: 'poll.opened',
      clubId: 'clubA',
      payload: { pollId: 'p1', title: 'X' },
    })
    // uX est dans l'allowlist mais PAS membre du club → intersection vide → 0 envoi, jamais epX.
    assertEquals(summary.sent, 0)
    assert(!rec.sentPayloads.some((p) => p.endpoint === 'epX'))
  }
)
