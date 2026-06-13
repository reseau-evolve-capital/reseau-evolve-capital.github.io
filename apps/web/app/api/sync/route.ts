// Endpoint POST /api/sync — déclenche manuellement la synchronisation Sheets → Postgres
// d'un club via l'Edge Function `sync`. Réservé aux rôles trésorier et plus.
//
// Garde-fous (SHE-007) :
//   - validation du corps { club_id } (zod) → 400
//   - authentification via session cookie Supabase → 401
//   - contrôle de rôle via RPC get_user_role_in_club (trésorier mini) → 403
//   - rate limit Upstash : 1 requête / 5 min par couple (club_id, user) → 429
//   - invocation de l'Edge Function → 502 en cas d'échec de TRANSPORT (invokeError)
//   - lecture du corps `data` de l'Edge (B3) : l'Edge renvoie TOUJOURS 200, même quand
//     success:false. On reflète le VRAI data.success + on propage errors[]/warnings[].
//   - réponse : relecture de clubs.synced_at → 200 { success, last_synced_at, errors, warnings }
//
// Réf : ARCHITECTURE.md §1, DATA_MODEL.md §3 (helpers RLS), CLAUDE.md (conventions sync).

import * as Sentry from '@sentry/nextjs'
import { cookies } from 'next/headers'
import { captureRouteError } from '@/lib/monitoring/sentry'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createServerClient } from '@evolve/data'

import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'

// Upstash fonctionne sur l'edge runtime, mais nodejs est le choix sûr par défaut.
export const runtime = 'nodejs'

const bodySchema = z.object({
  club_id: z.string().min(1),
})

// Rôles autorisés à déclencher une sync (trésorier minimum).
const ALLOWED_ROLES = ['treasurer', 'president', 'network_admin'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

function isAllowedRole(role: unknown): role is AllowedRole {
  return typeof role === 'string' && (ALLOWED_ROLES as readonly string[]).includes(role)
}

// Corps renvoyé par l'Edge Function `sync` (champs pertinents pour le feedback client).
// L'Edge répond TOUJOURS 200 ; `success` n'encode QUE les erreurs DURES, `warnings` est
// un ajout non-breaking. On lit défensivement (Edge non typée côté client).
interface SyncEdgeResult {
  success?: boolean
  errors?: unknown
  warnings?: unknown
}

/** Normalise un champ en tableau de strings non vides (l'Edge renvoie string[], mais on est défensif). */
function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0)
}

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Validation du corps.
  let parsed: z.infer<typeof bodySchema>
  try {
    const json: unknown = await request.json()
    parsed = bodySchema.parse(json)
  } catch {
    return NextResponse.json({ error: 'club_id requis.' }, { status: 400 })
  }
  const { club_id } = parsed

  // 2. Client Supabase serveur (session via cookies — cookies() est async en Next.js 16).
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  // 3. Authentification.
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) {
    return NextResponse.json({ error: "Erreur d'authentification." }, { status: 500 })
  }
  const user = authData.user
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  // 4. Contrôle de rôle (trésorier minimum) via le helper RLS.
  // Une erreur infra du RPC ne doit JAMAIS être déguisée en 403 : on renvoie 500.
  const { data: role, error: roleError } = await supabase.rpc('get_user_role_in_club', {
    p_club_id: club_id,
  })
  if (roleError) {
    return NextResponse.json({ error: 'Erreur lors de la vérification du rôle.' }, { status: 500 })
  }
  if (!isAllowedRole(role)) {
    return NextResponse.json({ error: 'Rôle insuffisant (trésorier minimum).' }, { status: 403 })
  }

  // 5. Rate limit : 1 requête / 5 min par couple (club, utilisateur) (fail-open géré par le helper).
  const rl = await checkRateLimit('sync', `${club_id}:${user.id}`)
  if (!rl.allowed) {
    return rateLimitedResponse(rl.retryAfterSeconds)
  }

  // 6. Invocation de l'Edge Function `sync`.
  //    invokeError = échec de TRANSPORT (réseau, fonction injoignable) → 502.
  //    Sinon l'Edge répond 200 mais peut contenir success:false + errors[] : on lit le corps.
  const { data: invokeData, error: invokeError } = await supabase.functions.invoke<SyncEdgeResult>(
    'sync',
    { body: { club_id } }
  )
  if (invokeError) {
    // Capture Sentry (no-op sans DSN). Contexte non nominatif : club_id + user.id + rôle.
    Sentry.captureException(invokeError, {
      tags: { sync_error: true, endpoint: '/api/sync', role },
      user: { id: user.id },
      extra: { club_id },
    })
    return NextResponse.json({ error: 'La synchronisation a échoué.' }, { status: 502 })
  }

  // 7. Lecture du corps de l'Edge (B3). success absent → on suppose un échec partiel non signalé.
  const errors = toStringArray(invokeData?.errors)
  const warnings = toStringArray(invokeData?.warnings)
  const success = invokeData?.success === true && errors.length === 0

  if (errors.length > 0) {
    captureRouteError(new Error('Sync partial failure'), {
      endpoint: '/api/sync',
      userId: user.id,
      extra: { club_id, errors, success: invokeData?.success ?? false },
    })
  }

  // 8. Relecture de la date de dernière sync (best-effort, ne bloque pas la réponse).
  const { data: club } = await supabase.from('clubs').select('synced_at').eq('id', club_id).single()

  // On répond TOUJOURS 200 (le transport a réussi) en reflétant le vrai état métier :
  // le client décide du feedback (succès / warning / erreur) à partir de ces champs.
  return NextResponse.json({
    success,
    last_synced_at: club?.synced_at ?? null,
    errors,
    warnings,
  })
}
