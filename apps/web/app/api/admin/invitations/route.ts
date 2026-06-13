// GET /api/admin/invitations — invitations du club (vue trésorier, ADM-007).
// Garde-fous identiques à /api/admin/members : auth → club_id → rôle staff. RLS en défense.
// Pas de service-role (la lecture passe par la RLS « invitations: staff read »).

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@evolve/data'
import { isStaffRole } from '@/lib/data/admin'
import { listClubInvitations, type Invitation } from '@/lib/data/invitations'
import { captureRouteError } from '@/lib/monitoring/sentry'

export const runtime = 'nodejs'

export async function GET(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError) return NextResponse.json({ error: "Erreur d'authentification." }, { status: 500 })
  if (!auth.user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const clubId = new URL(request.url).searchParams.get('club_id')
  if (!clubId) return NextResponse.json({ error: 'club_id requis.' }, { status: 400 })

  const { data: role, error: roleError } = await supabase.rpc('get_user_role_in_club', {
    p_club_id: clubId,
  })
  if (roleError) return NextResponse.json({ error: 'Erreur de rôle.' }, { status: 500 })
  if (!isStaffRole(role)) return NextResponse.json({ error: 'Rôle insuffisant.' }, { status: 403 })

  let invitations: Invitation[]
  try {
    invitations = await listClubInvitations(supabase, clubId)
  } catch (error) {
    captureRouteError(error, {
      endpoint: '/api/admin/invitations',
      userId: auth.user.id,
      extra: { club_id: clubId },
    })
    return NextResponse.json({ error: 'Erreur de chargement.' }, { status: 500 })
  }
  return NextResponse.json(
    { clubId, invitations },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
