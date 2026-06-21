// GET /api/admin/contributions — cotisations consolidées du club (ADM-005).
// ?club_id=… &membership_id=… (optionnel). Garde-fous = club-summary/members. RLS treasurer.

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@evolve/data'
import { isStaffRole, getMemberCotisationsForAdmin } from '@/lib/data/admin'
import { captureRouteError } from '@/lib/monitoring/sentry'

export const runtime = 'nodejs'

const EMPTY_CLUB_STATS = { recoveryRate: 0, lateAmount: 0, lateCount: 0, encaisse: 0 }
const EMPTY_LEGACY_STATS = { total: 0, count: 0, average: 0 }
const EMPTY_YEARS: never[] = []

export async function GET(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError) return NextResponse.json({ error: "Erreur d'authentification." }, { status: 500 })
  if (!auth.user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const url = new URL(request.url)
  const clubId = url.searchParams.get('club_id')
  const membershipId = url.searchParams.get('membership_id')
  if (!clubId) return NextResponse.json({ error: 'club_id requis.' }, { status: 400 })

  const { data: role, error: roleError } = await supabase.rpc('get_user_role_in_club', {
    p_club_id: clubId,
  })
  if (roleError) return NextResponse.json({ error: 'Erreur de rôle.' }, { status: 500 })
  if (!isStaffRole(role)) return NextResponse.json({ error: 'Rôle insuffisant.' }, { status: 403 })

  try {
    if (membershipId) {
      // Mode membre : fiche individuelle avec mois de retard, frise, taux de recouvrement.
      const member = await getMemberCotisationsForAdmin(supabase, clubId, membershipId)
      return NextResponse.json(
        {
          clubId,
          clubStats: EMPTY_CLUB_STATS,
          regulariserList: [],
          member,
          stats: EMPTY_LEGACY_STATS,
          years: EMPTY_YEARS,
        },
        { headers: { 'Cache-Control': 'private, no-store' } }
      )
    } else {
      // Mode club : le hook ne fetche jamais cette branche (initialData SSR utilisé).
      // On renvoie une forme valide pour la cohérence de type.
      return NextResponse.json(
        {
          clubId,
          clubStats: EMPTY_CLUB_STATS,
          regulariserList: [],
          member: null,
          stats: EMPTY_LEGACY_STATS,
          years: EMPTY_YEARS,
        },
        { headers: { 'Cache-Control': 'private, no-store' } }
      )
    }
  } catch (error) {
    captureRouteError(error, {
      endpoint: '/api/admin/contributions',
      userId: auth.user.id,
      extra: { club_id: clubId },
    })
    return NextResponse.json({ error: 'Erreur de chargement.' }, { status: 500 })
  }
}
