// Handler pur de l'Edge Function `dispatch-push` (PUSH-001 ; spec §7).
//
// Résout les destinataires d'un `NotificationEvent`, filtre sur les préférences push,
// envoie via Web Push (VAPID) par batch, purge les endpoints invalides (410/404), puis
// journalise un résumé AGRÉGÉ. AUCUN I/O concret ici : toutes les seams passent par
// `DispatchDeps`. Testable en isolation côté Deno (pas de réseau, pas de web-push).
//
// CLUB-SCOPING — règle de sécurité NON NÉGOCIABLE (§2.2, §7.3) :
//   Les destinataires sont EXCLUSIVEMENT les membres ACTIFS de `event.clubId`. Jamais un
//   autre club, jamais `network_wide`. Le filtrage par club se fait à la source
//   (`listClubActiveMemberUserIds(clubId)`) ; les subscriptions sont ensuite jointes par
//   user_id ⇒ une subscription d'un autre club ne peut JAMAIS être ciblée.
//
// ANONYMAT (§2.2) :
//   Le payload push ne porte QUE title / body / url / tag (issu de buildNotificationContent).
//   Jamais d'email, de user_id, de nom de votant, ni « X membres ont voté ».
//   `listUsersWhoVoted(pollId)` n'agrège que des user_id pour EXCLURE les votants du rappel —
//   ces id ne sortent jamais de la fonction.

// ---- Contenu de notification (miroir de @evolve/data NotificationContent) ----
// On évite une dépendance dure à @evolve/data : `buildContent` est injecté (l'index câble
// soit l'import de @evolve/data, soit un fallback inline aux mêmes chaînes FR).
export interface NotificationContent {
  title: string
  body: string
  url: string
  tag: string
}

export type NotificationEventType = 'poll.opened' | 'poll.closed' | 'poll.reminder' | 'system.test'

export interface NotificationEvent {
  type: NotificationEventType
  clubId: string
  payload: {
    pollId?: string
    title: string
    closesAt?: string | null
  }
}

/** Subscription navigateur (un endpoint = un appareil). */
export interface PushSubscriptionRow {
  endpoint: string
  p256dh: string
  auth: string
}

/** Résultat d'un envoi web-push unitaire. */
export interface WebPushResult {
  ok: boolean
  /** Code HTTP (ex. 410, 404) sur échec — jamais le corps de la réponse. */
  statusCode?: number
}

/** Résumé agrégé retourné par le handler (aucune PII). */
export interface DispatchSummary {
  sent: number
  failed: number
  skipped: number
}

export interface DispatchDeps {
  /** user_id des membres ACTIFS de `clubId` (status = 'active'). Source du club-scoping. */
  listClubActiveMemberUserIds: (clubId: string) => Promise<string[]>
  /**
   * Allowlist de TEST : user_id résolus depuis NOTIFY_ALLOWLIST (emails) côté index. Si NON VIDE,
   * on ne cible que les membres du club dont l'id y figure — INTERSECTION, jamais additif (le
   * club-scoping reste intact). Vide/undefined → comportement normal (tous les membres actifs).
   */
  allowlistUserIds?: string[]
  /** Subscriptions des users donnés, jointes à push_preferences (préférences par user). */
  listSubscriptions: (userIds: string[]) => Promise<SubscriptionWithPrefs[]>
  /** `notify_by_email` du poll (gate `poll.opened`). null si poll introuvable. */
  getPollNotifyFlag: (pollId: string) => Promise<boolean | null>
  /** user_id ayant DÉJÀ voté à ce poll (exclusion rappel). Jamais retourné à l'appelant. */
  listUsersWhoVoted: (pollId: string) => Promise<string[]>
  /** Envoie une push à un endpoint. Retourne le statut (sans corps). */
  sendWebPush: (sub: PushSubscriptionRow, payloadJson: string) => Promise<WebPushResult>
  /** Supprime une subscription invalide (410/404). */
  deleteSubscription: (endpoint: string) => Promise<void>
  /** Construit le contenu (FR, anonyme) depuis l'événement. */
  buildContent: (event: NotificationEvent) => NotificationContent
  /** Journalise un résumé agrégé (push_delivery_log). Best-effort. */
  logDelivery: (entry: {
    event_type: string
    club_id: string
    poll_id: string | null
    sent: number
    failed: number
    skipped: number
  }) => Promise<void>
  /** Log diagnostic (injectable pour test silencieux). */
  log?: (level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => void
}

/** Subscription + préférences du propriétaire (par user). */
export interface SubscriptionWithPrefs {
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  /** push_preferences.enabled (master). */
  enabled: boolean
  /** push_preferences.poll_opened. */
  pollOpened: boolean
  /** push_preferences.poll_closed. */
  pollClosed: boolean
  /** push_preferences.poll_reminder. */
  pollReminder: boolean
}

/** Taille de batch d'envoi (Promise.allSettled) — évite le timeout Edge sur gros clubs. */
const BATCH_SIZE = 50

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * Map événement → colonne de préférence par type. `system.test` n'est pas filtré par type
 * (il vise un seul destinataire explicite côté appelant), mais respecte tout de même `enabled`.
 */
function prefAllows(sub: SubscriptionWithPrefs, type: NotificationEventType): boolean {
  if (!sub.enabled) return false
  switch (type) {
    case 'poll.opened':
      return sub.pollOpened
    case 'poll.closed':
      return sub.pollClosed
    case 'poll.reminder':
      return sub.pollReminder
    case 'system.test':
      return true
  }
}

/**
 * Dispatch d'un `NotificationEvent` vers les membres actifs du club.
 *
 * 1. Résout les user_id destinataires = membres ACTIFS de `event.clubId` UNIQUEMENT.
 *    - `poll.opened` : NO-OP (skipped = N) si `notify_by_email` du poll est false.
 *    - `poll.reminder` : exclut les user_id ayant déjà voté.
 * 2. Joint les subscriptions et filtre sur `enabled` + la colonne du type.
 * 3. Envoie par batch de 50 (Promise.allSettled) ; purge 410/404.
 * 4. Journalise le résumé agrégé.
 */
export async function dispatchPush(
  deps: DispatchDeps,
  event: NotificationEvent
): Promise<DispatchSummary> {
  const log = deps.log ?? (() => {})
  const summary: DispatchSummary = { sent: 0, failed: 0, skipped: 0 }

  // ── 1. Résolution des destinataires — STRICTEMENT le club de l'événement ──
  let userIds = await deps.listClubActiveMemberUserIds(event.clubId)

  // ── Allowlist de TEST (NOTIFY_ALLOWLIST) — INTERSECTION user_id, jamais additif ──
  // Si renseignée, on restreint aux membres du club dont l'id y figure. Ne peut JAMAIS élargir
  // hors du club (on filtre une liste déjà club-scopée). Vide → comportement normal.
  if (deps.allowlistUserIds && deps.allowlistUserIds.length > 0) {
    const allow = new Set(deps.allowlistUserIds)
    userIds = userIds.filter((id) => allow.has(id))
  }

  // Gate `poll.opened` : ne rien envoyer si le poll n'a pas demandé la notification.
  if (event.type === 'poll.opened' && event.payload.pollId) {
    const notify = await deps.getPollNotifyFlag(event.payload.pollId)
    if (notify !== true) {
      // Tous les destinataires potentiels sont sautés (intent staff = pas de notif).
      summary.skipped = userIds.length
      await safeLog(deps, event, summary)
      return summary
    }
  }

  // Rappel : on retire les membres ayant déjà voté (anonymat — id internes uniquement).
  if (event.type === 'poll.reminder' && event.payload.pollId) {
    const voted = new Set(await deps.listUsersWhoVoted(event.payload.pollId))
    userIds = userIds.filter((id) => !voted.has(id))
  }

  if (userIds.length === 0) {
    await safeLog(deps, event, summary)
    return summary
  }

  // ── 2. Subscriptions des destinataires + filtre préférences ──
  const subs = await deps.listSubscriptions(userIds)
  // Garde-fou défense-en-profondeur : ne JAMAIS envoyer à une subscription dont le user
  // n'est pas dans la liste club-scopée (même si la requête fuitait).
  const allowedUsers = new Set(userIds)
  const eligible = subs.filter((s) => allowedUsers.has(s.userId) && prefAllows(s, event.type))

  // Les subscriptions filtrées par préférence comptent comme « skipped ».
  summary.skipped += subs.filter(
    (s) => allowedUsers.has(s.userId) && !prefAllows(s, event.type)
  ).length

  if (eligible.length === 0) {
    await safeLog(deps, event, summary)
    return summary
  }

  // ── 3. Construction du payload (FR, anonyme) ──
  const content = deps.buildContent(event)
  const payloadJson = JSON.stringify(content)

  // ── 4. Envoi par batch de 50 (Promise.allSettled) + purge 410/404 ──
  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map(async (sub) => {
        const res = await deps.sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payloadJson
        )
        if (!res.ok) {
          // 410 Gone / 404 → subscription morte : on la purge.
          if (res.statusCode === 410 || res.statusCode === 404) {
            await deps
              .deleteSubscription(sub.endpoint)
              .catch((e) => log('warn', 'Purge subscription échouée', { error: errMsg(e) }))
          }
          throw new Error(`push ${res.statusCode ?? 'KO'}`)
        }
        return true
      })
    )
    for (const r of results) {
      if (r.status === 'fulfilled') summary.sent += 1
      else summary.failed += 1
    }
  }

  await safeLog(deps, event, summary)
  return summary
}

/** Journalise le résumé agrégé sans jamais faire échouer le dispatch. */
async function safeLog(
  deps: DispatchDeps,
  event: NotificationEvent,
  summary: DispatchSummary
): Promise<void> {
  try {
    await deps.logDelivery({
      event_type: event.type,
      club_id: event.clubId,
      poll_id: event.payload.pollId ?? null,
      sent: summary.sent,
      failed: summary.failed,
      skipped: summary.skipped,
    })
  } catch (e) {
    ;(deps.log ?? (() => {}))('warn', 'logDelivery échouée', { error: errMsg(e) })
  }
}
