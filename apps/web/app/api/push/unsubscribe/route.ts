// POST|DELETE /api/push/unsubscribe — retire une subscription Web Push (PUSH-001 ; spec §6.3).
//
// Garde-fous :
//   - authentification via session cookie Supabase (getUser()) → 401
//   - DELETE par endpoint POUR l'utilisateur courant uniquement (filtre user_id + RLS)
//   - RLS s'applique (createServerClient, JAMAIS service-role) : policy « owner delete ».
//
// Appelé au logout (appareil partagé) et depuis le toggle « Notifications » du profil (OFF).
// Idempotent : retirer un endpoint inexistant retourne 200.

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createServerClient } from '@evolve/data'

export const runtime = 'nodejs'

async function deleteByEndpoint(endpointRaw: unknown): Promise<NextResponse> {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError) {
    return NextResponse.json({ error: "Erreur d'authentification." }, { status: 500 })
  }
  if (!auth.user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const endpoint = typeof endpointRaw === 'string' && endpointRaw.length > 0 ? endpointRaw : null
  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint manquant.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', auth.user.id)
    .eq('endpoint', endpoint)
  if (error) {
    return NextResponse.json({ error: 'Échec du désabonnement.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function POST(request: Request): Promise<NextResponse> {
  let endpoint: unknown
  try {
    endpoint = ((await request.json()) as { endpoint?: unknown }).endpoint
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }
  return deleteByEndpoint(endpoint)
}

export async function DELETE(request: Request): Promise<NextResponse> {
  // Endpoint via query (?endpoint=) OU corps JSON — supporte les deux usages (sendBeacon, fetch).
  const url = new URL(request.url)
  let endpoint: unknown = url.searchParams.get('endpoint') ?? undefined
  if (!endpoint) {
    try {
      endpoint = ((await request.json()) as { endpoint?: unknown }).endpoint
    } catch {
      /* pas de corps → endpoint reste undefined → 400 */
    }
  }
  return deleteByEndpoint(endpoint)
}
