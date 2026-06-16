// Edge Function `dispatch-push` — envoi Web Push d'un `NotificationEvent` (PUSH-001 ; spec §7).
//
// Déclenchement
// -------------
//   POST /functions/v1/dispatch-push   Body = NotificationEvent (JSON)
//   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
//   → 200 { sent, failed, skipped }
//
//   N'est JAMAIS appelée par le browser : uniquement les Server Actions (service role) et
//   les jobs cron (poll-push-reminders / poll-closed-push). verify_jwt = false (config.toml) :
//   le gateway ne valide pas la clé service-role (non-JWT) ; la fonction utilise SERVICE_ROLE
//   en interne pour bypass RLS et résoudre les destinataires.
//
// Parcours (handler pur, voir handler.ts)
// ---------------------------------------
//   Résout les membres ACTIFS de event.clubId UNIQUEMENT → joint subscriptions + prefs →
//   filtre (enabled + colonne du type) → envoie par batch de 50 (web-push VAPID) → purge
//   410/404 → journalise un résumé AGRÉGÉ (push_delivery_log, sans PII).
//
// CLUB-SCOPING : les destinataires viennent de `listClubActiveMemberUserIds(clubId)` — jamais
// un autre club. La requête memberships est filtrée `.eq('club_id', clubId).eq('status','active')`
// (réf send-monthly-attestations).
//
// web-push en Deno : `npm:web-push@^3` fonctionne via le pont npm de Deno. On configure les
// détails VAPID au démarrage (setVapidDetails) puis on appelle sendNotification par endpoint.
// Sur erreur, web-push lève une `WebPushError` portant `.statusCode` (ex. 410) — on le mappe
// vers WebPushResult sans jamais propager le corps de la réponse (anonymat / logs propres).
//
// Sécurité : SUPABASE_SERVICE_ROLE_KEY (bypass RLS), strictement côté serveur.

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import { dispatchPush } from './handler.ts'
import { alertSentry } from '../_shared/sentry.ts'
import type {
  DispatchDeps,
  NotificationContent,
  NotificationEvent,
  PushSubscriptionRow,
  SubscriptionWithPrefs,
  WebPushResult,
} from './handler.ts'

const VALID_TYPES = new Set(['poll.opened', 'poll.closed', 'poll.reminder', 'system.test'])

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Valide le corps JSON et le normalise en NotificationEvent (ou null si invalide). */
function parseEvent(raw: unknown): NotificationEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const type = o.type
  const clubId = o.clubId
  const payload = o.payload as Record<string, unknown> | undefined
  if (typeof type !== 'string' || !VALID_TYPES.has(type)) return null
  if (typeof clubId !== 'string' || clubId.trim() === '') return null
  if (!payload || typeof payload !== 'object') return null
  if (typeof payload.title !== 'string') return null
  return {
    type: type as NotificationEvent['type'],
    clubId,
    payload: {
      pollId: typeof payload.pollId === 'string' ? payload.pollId : undefined,
      title: payload.title,
      closesAt:
        typeof payload.closesAt === 'string'
          ? payload.closesAt
          : payload.closesAt === null
            ? null
            : undefined,
    },
  }
}

/** Câble les vraies deps (service-role client + web-push + templates @evolve/data). */
async function buildDeps(supabase: SupabaseClient): Promise<DispatchDeps> {
  // Import DYNAMIQUE des arbres lourds — hors du chemin testé (handler.ts).
  const webpush = (await import('npm:web-push@^3')).default
  const { buildNotificationContent } =
    await import('../../../packages/data/src/notifications/templates.ts')

  // Détails VAPID (env). Sans clés, sendNotification lèvera → comptabilisé en `failed`.
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@reseauevolvecapital.com'
  if (vapidPublic !== '' && vapidPrivate !== '') {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
  }

  return {
    listClubActiveMemberUserIds: async (clubId: string): Promise<string[]> => {
      // CLUB-SCOPING à la source : seuls les membres ACTIFS de ce club.
      const { data, error } = await supabase
        .from('memberships')
        .select('user_id, status')
        .eq('club_id', clubId)
        .eq('status', 'active')
      if (error) throw new Error(`Lecture membres échouée: ${error.message}`)
      // DISTINCT user_id (un user ne devrait avoir qu'un membership/club, mais on dédoublonne).
      const ids = new Set<string>()
      for (const m of data ?? []) {
        const id = m.user_id as string | null
        if (id) ids.add(id)
      }
      return [...ids]
    },

    listSubscriptions: async (userIds: string[]): Promise<SubscriptionWithPrefs[]> => {
      if (userIds.length === 0) return []
      // Subscriptions des destinataires, jointes à push_preferences (par user).
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select(
          'user_id, endpoint, p256dh, auth, push_preferences(enabled, poll_opened, poll_closed, poll_reminder)'
        )
        .in('user_id', userIds)
      if (error) throw new Error(`Lecture subscriptions échouée: ${error.message}`)
      return (data ?? []).map((row) => {
        const prefs = Array.isArray(row.push_preferences)
          ? row.push_preferences[0]
          : row.push_preferences
        return {
          userId: row.user_id as string,
          endpoint: row.endpoint as string,
          p256dh: row.p256dh as string,
          auth: row.auth as string,
          // Pas de ligne push_preferences ⇒ défauts ON (créée au 1er subscribe ; garde-fou).
          enabled: (prefs?.enabled as boolean | undefined) ?? true,
          pollOpened: (prefs?.poll_opened as boolean | undefined) ?? true,
          pollClosed: (prefs?.poll_closed as boolean | undefined) ?? true,
          pollReminder: (prefs?.poll_reminder as boolean | undefined) ?? true,
        }
      })
    },

    getPollNotifyFlag: async (pollId: string): Promise<boolean | null> => {
      const { data, error } = await supabase
        .from('polls')
        .select('notify_by_email')
        .eq('id', pollId)
        .maybeSingle()
      if (error) throw new Error(`Lecture poll échouée: ${error.message}`)
      if (!data) return null
      return (data.notify_by_email as boolean | null) ?? false
    },

    listUsersWhoVoted: async (pollId: string): Promise<string[]> => {
      // service_role uniquement (poll_responses.user_id n'est jamais exposé à authenticated).
      // Agrégation d'id internes pour EXCLURE les votants du rappel — jamais retournés.
      const { data, error } = await supabase
        .from('poll_responses')
        .select('user_id')
        .eq('poll_id', pollId)
      if (error) throw new Error(`Lecture poll_responses échouée: ${error.message}`)
      const ids = new Set<string>()
      for (const r of data ?? []) {
        const id = r.user_id as string | null
        if (id) ids.add(id)
      }
      return [...ids]
    },

    sendWebPush: async (sub: PushSubscriptionRow, payloadJson: string): Promise<WebPushResult> => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadJson
        )
        return { ok: true }
      } catch (e) {
        // web-push lève une WebPushError portant `.statusCode`. On ne propage QUE le code.
        const statusCode =
          e && typeof e === 'object' && 'statusCode' in e
            ? Number((e as { statusCode: unknown }).statusCode)
            : undefined
        return { ok: false, statusCode: Number.isFinite(statusCode) ? statusCode : undefined }
      }
    },

    deleteSubscription: async (endpoint: string): Promise<void> => {
      const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
      if (error) throw new Error(`Purge subscription échouée: ${error.message}`)
    },

    buildContent: (event: NotificationEvent): NotificationContent =>
      buildNotificationContent(event) as NotificationContent,

    logDelivery: async (entry): Promise<void> => {
      const { error } = await supabase.from('push_delivery_log').insert({
        event_type: entry.event_type,
        club_id: entry.club_id,
        poll_id: entry.poll_id,
        sent_count: entry.sent,
        failed_count: entry.failed,
        skipped_count: entry.skipped,
      })
      if (error) throw new Error(`Insert push_delivery_log échoué: ${error.message}`)
    },

    log: (level, msg, meta) => {
      const line = `[dispatch-push] ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`
      if (level === 'error') console.error(line)
      else if (level === 'warn') console.warn(line)
      else console.log(line)
    },
  }
}

// ---- Entrypoint de production ----
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    let event: NotificationEvent | null = null
    try {
      const body = await req.json().catch(() => null)
      event = parseEvent(body)
    } catch {
      event = null
    }
    if (!event) {
      return json({ ok: false, error: 'NotificationEvent invalide' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
      const deps = await buildDeps(supabase)
      const summary = await dispatchPush(deps, event)
      return json({ ok: true, ...summary })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      const dsn = Deno.env.get('SENTRY_DSN')
      await alertSentry(dsn, {
        club_id: event.clubId,
        errors: [message],
        sheets: ['dispatch-push'],
      }).catch(() => {})
      return json({ ok: false, error: message }, 500)
    }
  })
}

export { buildDeps, parseEvent }
