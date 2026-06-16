// Edge Function `poll-push-reminders` — cible cron du rappel vote J-1 (PUSH-001 ; spec §7.5).
//
// Déclenchement
// -------------
//   pg_cron `poll-push-reminders` (migration 039, quotidien ~07:00 UTC / ~09:00 Paris) POST `{}`
//   avec `Authorization: Bearer <service_role>` (URL Vault `poll_push_reminders_url`).
//   verify_jwt = false (config.toml) : la clé service-role n'est pas un JWT.
//
// Rôle (THIN) : sélectionne les polls OUVERTS dont l'échéance tombe dans les 24 h, puis
// dispatch un `poll.reminder` par poll en RÉUTILISANT le handler `dispatch-push` (mêmes deps,
// même club-scoping). Aucune logique d'envoi ici : tout vit dans `dispatch-push/handler.ts`.
//
// CLUB-SCOPING : chaque dispatch est borné au `club_id` du poll (résolution dans le handler
// partagé). Le rappel exclut les membres ayant déjà voté (logique du handler).
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

/** Polls OUVERTS dont closes_at ∈ [now, now+24h] — éligibles au rappel J-1. */
async function listPollsDueSoon(
  supabase: SupabaseClient
): Promise<{ id: string; club_id: string; title: string; closes_at: string | null }[]> {
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const { data, error } = await supabase
    .from('polls')
    .select('id, club_id, title, closes_at')
    .eq('status', 'open')
    .not('closes_at', 'is', null)
    .gte('closes_at', now.toISOString())
    .lte('closes_at', in24h.toISOString())
  if (error) throw new Error(`Lecture polls échéant sous 24h échouée: ${error.message}`)
  return (data ?? []).map((p) => ({
    id: p.id as string,
    club_id: p.club_id as string,
    title: (p.title as string) ?? '',
    closes_at: (p.closes_at as string | null) ?? null,
  }))
}

if (import.meta.main) {
  Deno.serve(async () => {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
      const polls = await listPollsDueSoon(supabase)
      const deps = await buildDeps(supabase)

      let processed = 0
      const totals = { sent: 0, failed: 0, skipped: 0 }
      for (const p of polls) {
        // NON-ARRÊT : un poll en échec ne bloque pas les autres.
        try {
          const summary = await dispatchPush(deps, {
            type: 'poll.reminder',
            clubId: p.club_id,
            payload: { pollId: p.id, title: p.title, closesAt: p.closes_at },
          })
          totals.sent += summary.sent
          totals.failed += summary.failed
          totals.skipped += summary.skipped
          processed += 1
        } catch (e) {
          console.error(
            `[poll-push-reminders] dispatch échoué pour poll ${p.id}: ${
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
        club_id: 'poll-push-reminders',
        errors: [message],
        sheets: ['poll-push-reminders'],
      }).catch(() => {})
      return json({ ok: false, error: message }, 500)
    }
  })
}

export { listPollsDueSoon }
