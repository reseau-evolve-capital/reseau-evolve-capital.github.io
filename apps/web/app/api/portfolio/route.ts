// GET /api/portfolio — positions du club du membre courant (PFT-004).
//
// Garde-fous :
//   - authentification via session cookie Supabase → 401
//   - résolution du club : ?club_id=… sinon dernière adhésion active → 404 si aucun
//   - RLS isole les données par auth.uid() (policy positions: club member read)
//   - aucune position active → 404 (état empty côté UI)
//
// IMPORTANT : le client Supabase est créé avec createServerClient (session cookie).
// JAMAIS de service-role ici — la RLS doit s'appliquer.
//
// Réf : PFT-004, ARCHITECTURE.md §1, DATA_MODEL.md §2, CLAUDE.md (RLS).

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createServerClient } from '@evolve/data'

import { getPortfolioData } from '@/lib/data/portfolio'

export const runtime = 'nodejs'

export async function GET(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError) {
    return NextResponse.json({ error: "Erreur d'authentification." }, { status: 500 })
  }
  if (!auth.user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const url = new URL(request.url)
  let clubId = url.searchParams.get('club_id')
  if (!clubId) {
    const { data: m } = await supabase
      .from('memberships')
      .select('club_id')
      .eq('user_id', auth.user.id)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ club_id: string }>()
    clubId = m?.club_id ?? null
  }
  if (!clubId) {
    return NextResponse.json({ error: 'Aucun club.' }, { status: 404 })
  }

  let data
  try {
    data = await getPortfolioData(supabase, auth.user.id, clubId)
  } catch {
    return NextResponse.json({ error: 'Erreur de chargement.' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Données indisponibles.' }, { status: 404 })
  }

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
  })
}
