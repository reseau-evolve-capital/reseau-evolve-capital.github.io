// GET /api/portfolio — positions du club du membre courant (PFT-004).
//
// Garde-fous :
//   - authentification via session cookie Supabase → 401
//   - résolution du club : ?club_id=… sinon dernière adhésion active → 404 SI AUCUN CLUB
//   - RLS isole les données par auth.uid() (policy positions: club member read)
//   - club existant mais SANS position active → 200 avec un PortfolioData vide
//     (`positions: []`). C'est un état nominal (portefeuille vide), pas une erreur :
//     renvoyer 404 ici polluait la console (FIX-API-001). Le 404 est réservé au
//     club introuvable ; l'UI dégrade le portefeuille vide vers l'EmptyState.
//   - vraie erreur de chargement (throw getPortfolioData) → 500
//
// IMPORTANT : le client Supabase est créé avec createServerClient (session cookie).
// JAMAIS de service-role ici — la RLS doit s'appliquer.
//
// Réf : PFT-004, FIX-API-001, ARCHITECTURE.md §1, DATA_MODEL.md §2, CLAUDE.md (RLS).

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createServerClient } from '@evolve/data'

import { getMemberRole, getPortfolioData, type PortfolioData } from '@/lib/data/portfolio'
import { captureRouteError } from '@/lib/monitoring/sentry'

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

  let data: PortfolioData | null
  try {
    data = await getPortfolioData(supabase, auth.user.id, clubId)
  } catch (error) {
    captureRouteError(error, {
      endpoint: '/api/portfolio',
      userId: auth.user.id,
      extra: { club_id: clubId },
    })
    return NextResponse.json({ error: 'Erreur de chargement.' }, { status: 500 })
  }

  // Club existant mais sans position active → portefeuille vide (état nominal).
  // On renvoie 200 avec un PortfolioData VALIDE (`positions: []`, totaux implicites à 0,
  // pas de NaN/undefined) plutôt qu'un 404 trompeur. L'UI dégrade vers l'EmptyState.
  if (!data) {
    const userRole = await getMemberRole(supabase, auth.user.id, clubId)
    const empty: PortfolioData = { clubId, positions: [], aggregates: [], syncedAt: null, userRole }
    return NextResponse.json(empty, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
