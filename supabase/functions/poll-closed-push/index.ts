// Edge Function `poll-closed-push` — cible cron du push post-clôture (PUSH-001 ; spec §8.3, option A).
//
// Déclenchement
// -------------
//   pg_cron `poll-closed-push` (migration 039, horaire à HH:05) POST `{}` avec
//   `Authorization: Bearer <service_role>` (URL Vault `poll_closed_push_url`).
//   verify_jwt = false (config.toml) : la clé service-role n'est pas un JWT.
//
// Rôle (THIN) : dispatch un `poll.closed` pour chaque vote FRAÎCHEMENT clôturé par échéance,
// en RÉUTILISANT le handler `dispatch-push` (mêmes deps, même club-scoping).
//
// POURQUOI ne PAS rappeler close_due_polls() (gotcha de timing) :
//   Le job `close-due-polls` (migration 038) tourne à HH:00 et bascule déjà open→closed.
//   `poll-closed-push` tourne à HH:05 : appeler close_due_polls() ici renverrait 0 ligne
//   (tout est déjà 'closed'). On LIT donc les polls fraîchement clôturés par DEADLINE
//   (status='closed' AND closes_at < now()) et on DÉDOUBLONNE via push_delivery_log :
//   un poll qui a déjà une entrée 'poll.closed' n'est PAS re-poussé. Ce garde-fou couvre
//   aussi le cas d'une clôture manuelle ayant déjà dispatché (Server Action).
//
// CLUB-SCOPING : chaque dispatch est borné au `club_id` du poll (handler partagé).
//
// Sécurité : SUPABASE_SERVICE_ROLE_KEY (bypass RLS), strictement côté serveur.

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import { dispatchPush } from '../dispatch-push/handler.ts'
import { buildDeps } from '../dispatch-push/index.ts'
import { alertSentry } from '../_shared/sentry.ts'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Polls clôturés par DEADLINE pour lesquels aucun `poll.closed` n'a encore été journalisé.
 * On borne la fenêtre aux 7 derniers jours (évite de re-scanner tout l'historique ; au-delà,
 * l'absence de log signifierait un trou de cron qu'on ne cherche pas à rattraper).
 */
async function listFreshlyClosedPolls(
  supabase: SupabaseClient
): Promise<{ id: string; club_id: string; title: string; closes_at: string | null }[]> {
  const nowIso = new Date().toISOString()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: closed, error } = await supabase
    .from('polls')
    .select('id, club_id, title, closes_at, closed_manually_at')
    .eq('status', 'closed')
    .not('closes_at', 'is', null)
    .lt('closes_at', nowIso)
    .gte('closed_manually_at', since)
  if (error) throw new Error(`Lecture polls clôturés échouée: ${error.message}`)

  const candidates = (closed ?? []).map((p) => ({
    id: p.id as string,
    club_id: p.club_id as string,
    title: (p.title as string) ?? '',
    closes_at: (p.closes_at as string | null) ?? null,
  }))
  if (candidates.length === 0) return []

  // DÉDUP : retire les polls qui ont déjà une entrée push 'poll.closed' (autre run / clôture manuelle).
  const { data: logged, error: logErr } = await supabase
    .from('push_delivery_log')
    .select('poll_id')
    .eq('event_type', 'poll.closed')
    .in(
      'poll_id',
      candidates.map((c) => c.id)
    )
  if (logErr) throw new Error(`Lecture push_delivery_log échouée: ${logErr.message}`)
  const alreadyPushed = new Set((logged ?? []).map((r) => r.poll_id as string))

  return candidates.filter((c) => !alreadyPushed.has(c.id))
}

if (import.meta.main) {
  Deno.serve(async () => {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
      const polls = await listFreshlyClosedPolls(supabase)
      const deps = await buildDeps(supabase)

      let processed = 0
      const totals = { sent: 0, failed: 0, skipped: 0 }
      for (const p of polls) {
        try {
          const summary = await dispatchPush(deps, {
            type: 'poll.closed',
            clubId: p.club_id,
            payload: { pollId: p.id, title: p.title, closesAt: p.closes_at },
          })
          totals.sent += summary.sent
          totals.failed += summary.failed
          totals.skipped += summary.skipped
          processed += 1
        } catch (e) {
          console.error(
            `[poll-closed-push] dispatch échoué pour poll ${p.id}: ${
              e instanceof Error ? e.message : String(e)
            }`
          )
        }
      }

      return json({ ok: true, polls: polls.length, processed, ...totals })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      const dsn = Deno.env.get('SENTRY_DSN')
      await alertSentry(dsn, {
        club_id: 'poll-closed-push',
        errors: [message],
        sheets: ['poll-closed-push'],
      }).catch(() => {})
      return json({ ok: false, error: message }, 500)
    }
  })
}

export { listFreshlyClosedPolls }
