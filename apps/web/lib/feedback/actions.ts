'use server'

// Server Action du Feedback Widget V0 (spec §4).
//
// FLUX : le membre soumet un retour depuis le sheet (packages/ui), l'app appelle cette
// action. On insère dans `public.feedback` SOUS la session du membre (anon key + cookies)
// → la policy RLS « feedback: self insert » (migration 036) autorise l'INSERT pour soi.
// JAMAIS de service-role ici (CLAUDE.md). L'écriture des colonnes ai_*/flags/liens externes
// est faite plus tard par l'Edge Function `feedback-dispatch`, déclenchée par le trigger PG
// AFTER INSERT — l'app NE l'appelle PAS.
//
// CAPTURE (optionnelle) : si une dataURL PNG est fournie, on l'uploade dans le bucket PRIVÉ
// `screenshots` sous `screenshots/{uid}/<uuid>.png` (policy « screenshots: self write »), puis
// on stocke une URL SIGNÉE longue durée dans `screenshot_url`. Un échec d'upload est NON FATAL
// (spec §3) : on insère quand même le feedback avec `screenshot_url = null`.
//
// Réf : apps/web/app/(app)/admin/actions.ts (modèle d'action + retour discriminé),
//   lib/upload/avatar.ts (pattern Storage, mais client/public — ici server + bucket privé),
//   migration 036_feedback.sql (table + bucket + RLS + trigger).

import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import type { FeedbackSubmission } from '@evolve/ui'

/** Résultat discriminé (jamais de throw) — l'UI mappe l'erreur sur un message i18n. */
export type FeedbackActionResult = { ok: true } | { ok: false; error: string }

/** URL signée longue durée pour la capture (bucket privé). 10 ans ≈ « permanente » côté membre. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10

/**
 * Décode une dataURL PNG base64 (`data:image/png;base64,XXXX`) en octets bruts.
 * Retourne `null` si le format n'est pas une dataURL base64 exploitable (on continuera
 * alors sans capture — non fatal).
 */
function decodeDataUrl(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(',')
  if (comma === -1 || !dataUrl.slice(0, comma).includes('base64')) return null
  const base64 = dataUrl.slice(comma + 1)
  try {
    // Buffer est dispo côté serveur Node — décodage base64 → octets.
    return new Uint8Array(Buffer.from(base64, 'base64'))
  } catch {
    return null
  }
}

export async function submitFeedbackAction(
  submission: FeedbackSubmission
): Promise<FeedbackActionResult> {
  const supabase = createServerClient(await cookies())

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }

  // ── Capture (optionnelle, non fatale) ──────────────────────────────────────
  let screenshotUrl: string | null = null
  if (submission.screenshotDataUrl) {
    const bytes = decodeDataUrl(submission.screenshotDataUrl)
    if (bytes) {
      const path = `${user.id}/${crypto.randomUUID()}.png`
      const { error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(path, bytes, { contentType: 'image/png' })
      if (!uploadError) {
        const { data: signed } = await supabase.storage
          .from('screenshots')
          .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
        screenshotUrl = signed?.signedUrl ?? null
      }
      // uploadError ⇒ on laisse screenshotUrl = null : le retour part SANS capture (spec §3).
    }
  }

  // ── INSERT du retour (sous RLS du membre) ───────────────────────────────────
  const { error: insertError } = await supabase.from('feedback').insert({
    user_id: user.id,
    user_email: user.email ?? '',
    type: submission.type,
    message: submission.message,
    screenshot_url: screenshotUrl,
    page_url: submission.pageUrl,
    page_route: submission.pageRoute,
    user_agent: submission.userAgent || null,
    // ai_* / github_issue_url / notion_page_id / discord_notified / email_sent / status :
    // laissés aux défauts DB — remplis par l'Edge Function feedback-dispatch (service_role).
  })
  if (insertError) return { ok: false, error: 'insert_failed' }

  return { ok: true }
}
