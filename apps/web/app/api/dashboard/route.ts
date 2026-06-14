// Endpoint GET /api/dashboard — données du dashboard du membre courant (DSH-006).
//
// Garde-fous :
//   - authentification via session cookie Supabase → 401
//   - résolution du club : ?club_id=… sinon dernière adhésion active → 404 si aucun
//   - RLS isole les données par auth.uid() (vue member_quote_part)
//   - aucune ligne quote-part → 404 (état empty côté UI)
//
// La valorisation est BOOK (V0) : voir lib/data/dashboard.ts et price-provider.ts.
// Réf : ARCHITECTURE.md §1, DATA_MODEL.md §2, CLAUDE.md (RLS, valorisation book).

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createServerClient } from '@evolve/data'

import { getDashboardData } from '@/lib/data/dashboard'
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

  let data
  try {
    data = await getDashboardData(supabase, auth.user.id, clubId)
  } catch (error) {
    captureRouteError(error, {
      endpoint: '/api/dashboard',
      userId: auth.user.id,
      extra: { club_id: clubId },
    })
    return NextResponse.json({ error: 'Erreur de chargement.' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Données indisponibles.' }, { status: 404 })
  }

  // Données par-membre et sensibles (quote-part, valorisation) : JAMAIS de cache partagé
  // (CDN) ni de persistance sur l'appareil. `private, no-store` — cohérent avec toutes les
  // autres routes de données membre (/api/contributions, /api/portfolio, /api/admin/*) et
  // requis pour que le service worker PWA n'en serve pas une copie périmée (cf. public/sw.js).
  // Régression : un `s-maxage=…, stale-while-revalidate` laissait le SW iOS rejouer une
  // ancienne quote-part après sync (« la valeur a drastiquement baissé sur Safari »).
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
