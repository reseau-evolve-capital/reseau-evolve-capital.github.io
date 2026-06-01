// GET /api/admin/members — tous les membres du club (vue trésorier, ADM-003).
// Garde-fous identiques à club-summary. RLS treasurer en défense. Pas de service-role.

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@evolve/data'
import { getClubMembers, isStaffRole, type ClubMember } from '@/lib/data/admin'

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

  let members: ClubMember[]
  try {
    members = await getClubMembers(supabase, clubId)
  } catch {
    return NextResponse.json({ error: 'Erreur de chargement.' }, { status: 500 })
  }
  return NextResponse.json(
    { clubId, members },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
