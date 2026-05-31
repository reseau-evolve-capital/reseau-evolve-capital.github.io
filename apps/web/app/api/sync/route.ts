// Endpoint POST /api/sync — déclenche manuellement la synchronisation Sheets → Postgres
// d'un club via l'Edge Function `sync`. Réservé aux rôles trésorier et plus.
//
// Garde-fous (SHE-007) :
//   - validation du corps { club_id } (zod) → 400
//   - authentification via session cookie Supabase → 401
//   - contrôle de rôle via RPC get_user_role_in_club (trésorier mini) → 403
//   - rate limit Upstash : 1 requête / 5 min par couple (club_id, user) → 429
//   - invocation de l'Edge Function → 502 en cas d'échec
//   - succès : relecture de clubs.synced_at → 200 { success, last_synced_at }
//
// Réf : ARCHITECTURE.md §1, DATA_MODEL.md §3 (helpers RLS), CLAUDE.md (conventions sync).

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { z } from 'zod'

import { createServerClient } from '@evolve/data'

// Upstash fonctionne sur l'edge runtime, mais nodejs est le choix sûr par défaut.
export const runtime = 'nodejs'

// Singleton au niveau module : évite de reconstruire le client Redis à chaque requête.
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(1, '5 m'),
  prefix: 'sync',
})

const bodySchema = z.object({
  club_id: z.string().min(1),
})

// Rôles autorisés à déclencher une sync (trésorier minimum).
const ALLOWED_ROLES = ['treasurer', 'president', 'network_admin'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

function isAllowedRole(role: unknown): role is AllowedRole {
  return typeof role === 'string' && (ALLOWED_ROLES as readonly string[]).includes(role)
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  // 4. Contrôle de rôle (trésorier minimum) via le helper RLS.
  const { data: role } = await supabase.rpc('get_user_role_in_club', {
    p_club_id: club_id,
  })
  if (!isAllowedRole(role)) {
    return NextResponse.json({ error: 'Rôle insuffisant (trésorier minimum).' }, { status: 403 })
  }

  // 5. Rate limit : 1 requête / 5 min par couple (club, utilisateur).
  const { success } = await ratelimit.limit(`sync:${club_id}:${user.id}`)
  if (!success) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessaie dans quelques minutes.' },
      { status: 429 }
    )
  }

  // 6. Invocation de l'Edge Function `sync`.
  const { error: invokeError } = await supabase.functions.invoke('sync', {
    body: { club_id },
  })
  if (invokeError) {
    return NextResponse.json({ error: 'La synchronisation a échoué.' }, { status: 502 })
  }

  // 7. Relecture de la date de dernière sync.
  const { data: club } = await supabase.from('clubs').select('synced_at').eq('id', club_id).single()

  return NextResponse.json({
    success: true,
    last_synced_at: club?.synced_at ?? null,
  })
}
