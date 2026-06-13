'use server'

// Server Action du Feedback Widget V0 (spec §4) — multi-upload (LOT D).
//
// FLUX : le membre soumet un retour depuis le sheet (packages/ui), l'app appelle cette
// action. On insère dans `public.feedback` SOUS la session du membre (anon key + cookies)
// → la policy RLS « feedback: self insert » (migration 036) autorise l'INSERT pour soi.
// JAMAIS de service-role ici (CLAUDE.md). L'écriture des colonnes ai_*/flags/liens externes
// est faite plus tard par l'Edge Function `feedback-dispatch`, déclenchée par le trigger PG
// AFTER INSERT — l'app NE l'appelle PAS.
//
// PIÈCES JOINTES (optionnelles) : l'utilisateur joint JUSQU'À 3 images (data URLs). Pour
// chaque image valide on uploade dans le bucket PRIVÉ `screenshots` sous
// `screenshots/{uid}/<uuid>.<ext>` (policy « screenshots: self write »), puis on stocke une
// URL SIGNÉE longue durée. La colonne `screenshot_urls` (text[] — migration 036) reçoit le
// tableau des URLs signées (null si aucune image n'a survécu). Garde-fous NON FATALS (spec §3) :
//   - surplus > 3 → tronqué à 3 (jamais de crash) ;
//   - entrée non-`data:image/...` → ignorée ;
//   - image > ~5 Mo (décodée) → ignorée ;
//   - échec d'upload/signature d'UNE image → on saute cette image, on continue avec les autres.
// Le feedback est inséré dans tous les cas (même sans aucune image).
//
// Réf : apps/web/app/(app)/admin/actions.ts (modèle d'action + retour discriminé),
//   lib/upload/avatar.ts (pattern Storage, mais client/public — ici server + bucket privé),
//   migration 036_feedback.sql (table + bucket + RLS + trigger).

import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import type { FeedbackSubmission } from '@evolve/ui'
import { MAX_FEEDBACK_IMAGES } from '@evolve/ui'
import { captureActionError } from '@/lib/monitoring/sentry'

/** Résultat discriminé (jamais de throw) — l'UI mappe l'erreur sur un message i18n. */
export type FeedbackActionResult = { ok: true } | { ok: false; error: string }

/** URL signée longue durée pour les images (bucket privé). 10 ans ≈ « permanente » côté membre. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10

/** Garde-fou de taille : on ignore une image dont les octets décodés dépassent ~5 Mo. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** Une image décodée prête à l'upload (octets + extension + content-type dérivés du MIME). */
interface DecodedImage {
  bytes: Uint8Array
  ext: string
  contentType: string
}

/** Extension de fichier dérivée d'un MIME image (`image/png` → `png`). Défaut prudent : `png`. */
function extFromMime(mime: string): string {
  const subtype = mime.slice('image/'.length).toLowerCase()
  if (subtype === 'jpeg' || subtype === 'jpg') return 'jpg'
  if (subtype === 'svg+xml') return 'svg'
  // Sous-type alphanumérique simple (png, webp, gif, avif…) → tel quel ; sinon fallback png.
  return /^[a-z0-9]+$/.test(subtype) ? subtype : 'png'
}

/**
 * Décode une data URL d'image base64 (`data:image/<sub>;base64,XXXX`) en octets + métadonnées.
 * Retourne `null` si : ce n'est pas une `data:image/...;base64`, le base64 est invalide, ou la
 * taille dépasse le garde-fou. L'appelant ignore alors cette image (non fatal, spec §3).
 */
function decodeImageDataUrl(dataUrl: string): DecodedImage | null {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return null
  const header = dataUrl.slice('data:'.length, comma) // ex. `image/png;base64`
  if (!header.includes('base64')) return null
  const mime = header.split(';')[0] ?? 'image/png' // `image/png`
  try {
    const bytes = new Uint8Array(Buffer.from(dataUrl.slice(comma + 1), 'base64'))
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) return null
    return { bytes, ext: extFromMime(mime), contentType: mime }
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

  // ── Images jointes (optionnelles, non fatales) ─────────────────────────────
  // Validation : tronque à MAX_FEEDBACK_IMAGES, décode/valide chaque entrée, ignore le reste.
  const candidates = Array.isArray(submission.imageDataUrls)
    ? submission.imageDataUrls.slice(0, MAX_FEEDBACK_IMAGES)
    : []

  const signedUrls: string[] = []
  for (const dataUrl of candidates) {
    const decoded = decodeImageDataUrl(dataUrl)
    if (!decoded) continue // format/taille invalide → on saute cette image (non fatal).

    const path = `${user.id}/${crypto.randomUUID()}.${decoded.ext}`
    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(path, decoded.bytes, { contentType: decoded.contentType })
    if (uploadError) continue // échec d'upload d'UNE image → on saute, on continue (spec §3).

    const { data: signed } = await supabase.storage
      .from('screenshots')
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    if (signed?.signedUrl) signedUrls.push(signed.signedUrl)
  }

  // ── INSERT du retour (sous RLS du membre) ───────────────────────────────────
  const { error: insertError } = await supabase.from('feedback').insert({
    user_id: user.id,
    user_email: user.email ?? '',
    type: submission.type,
    message: submission.message,
    // Colonne text[] (migration 036) : tableau des URLs signées des images qui ont survécu,
    // null si aucune (pas d'image jointe, ou toutes invalides/échouées — non fatal).
    screenshot_urls: signedUrls.length > 0 ? signedUrls : null,
    page_url: submission.pageUrl,
    page_route: submission.pageRoute,
    user_agent: submission.userAgent || null,
    // ai_* / github_issue_url / notion_page_id / discord_notified / email_sent / status :
    // laissés aux défauts DB — remplis par l'Edge Function feedback-dispatch (service_role).
  })
  if (insertError) {
    captureActionError(insertError, {
      action: 'submitFeedback',
      userId: user.id,
      extra: { step: 'insert', code: insertError.code },
    })
    return { ok: false, error: 'insert_failed' }
  }

  return { ok: true }
}
