// GET /api/admin/club-summary — KPIs consolidés du club (vue trésorier, ADM-002).
// Garde-fous : auth → 401 ; rôle trésorier+ par-club → 403 ; RLS treasurer en défense.
// JAMAIS de service-role. Réf : E-ADM, DATA_MODEL.md §3, CLAUDE.md.

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@evolve/data'
import { getClubSummary, canViewClubAdmin, type ClubSummary } from '@/lib/data/admin'
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
  // GET = LECTURE → secrétaire admis (palier lecture). La RLS treasurer/secretary garde le data.
  if (!canViewClubAdmin(role))
    return NextResponse.json({ error: 'Rôle insuffisant.' }, { status: 403 })

  let data: ClubSummary
  try {
    data = await getClubSummary(supabase, clubId, role)
  } catch (error) {
    captureRouteError(error, {
      endpoint: '/api/admin/club-summary',
      userId: auth.user.id,
      extra: { club_id: clubId },
    })
    return NextResponse.json({ error: 'Erreur de chargement.' }, { status: 500 })
  }
  return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
}
