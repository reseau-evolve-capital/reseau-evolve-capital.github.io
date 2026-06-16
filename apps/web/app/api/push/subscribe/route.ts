// POST /api/push/subscribe — persiste une subscription Web Push (PUSH-001 ; spec §6.3).
//
// Garde-fous :
//   - authentification via session cookie Supabase (getUser()) → 401
//   - UPSERT push_subscriptions par endpoint (1 ligne = 1 navigateur, multi-appareils/user)
//   - UPSERT push_preferences (défauts ON) au premier abonnement
//   - RLS s'applique (createServerClient, JAMAIS service-role) : un membre ne touche QUE
//     ses propres subscriptions (policies « owner insert/update »).
//
// Anonymat / PII : on persiste user_agent + platform (snapshot debug support) — jamais
// d'email, jamais de contenu. Le payload push lui-même (envoyé par l'Edge) ne porte pas de PII.
//
// Réf : DATA_MODEL / migration 039, CLAUDE.md (RLS, SERVICE_ROLE server-only).

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createServerClient } from '@evolve/data'

export const runtime = 'nodejs'

/** Plateformes acceptées (aligné sur le CHECK de la migration 039). */
const PLATFORMS = new Set([
  'desktop',
  'android-chrome',
  'ios-safari',
  'ios-other',
  'standalone',
  'unknown',
])

type SubscribeBody = {
  endpoint?: unknown
  keys?: { p256dh?: unknown; auth?: unknown }
  userAgent?: unknown
  platform?: unknown
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

export async function POST(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError) {
    return NextResponse.json({ error: "Erreur d'authentification." }, { status: 500 })
  }
  if (!auth.user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  let body: SubscribeBody
  try {
    body = (await request.json()) as SubscribeBody
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const endpoint = asString(body.endpoint)
  const p256dh = asString(body.keys?.p256dh)
  const authKey = asString(body.keys?.auth)
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: 'Subscription incomplète.' }, { status: 400 })
  }

  const userAgent = asString(body.userAgent)
  const platformRaw = asString(body.platform)
  const platform = platformRaw && PLATFORMS.has(platformRaw) ? platformRaw : 'unknown'

  // UPSERT par endpoint : un même navigateur qui se réabonne met à jour ses clés/UA.
  const { error: subError } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: auth.user.id,
      endpoint,
      p256dh,
      auth: authKey,
      user_agent: userAgent,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  )
  if (subError) {
    return NextResponse.json({ error: "Échec de l'enregistrement." }, { status: 500 })
  }

  // Défauts ON au premier abonnement. ignoreDuplicates : ne pas écraser un réglage existant
  // (un membre déjà abonné sur un autre appareil garde ses préférences par type).
  const { error: prefError } = await supabase
    .from('push_preferences')
    .upsert({ user_id: auth.user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
  if (prefError) {
    // Non bloquant : la subscription est persistée ; les défauts seront appliqués par l'Edge.
    return NextResponse.json({ ok: true, preferences: 'skipped' }, { status: 201 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
