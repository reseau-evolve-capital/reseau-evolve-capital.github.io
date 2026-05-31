// GET /api/market-prices?symbols=NASDAQ:META,EURONEXT:MC (PFT-007).
//
// Server-only : les secrets providers (GOOGLE_APPS_SCRIPT_SECRET, ALPHA_VANTAGE_KEY, etc.)
// ne transitent jamais côté client. Fallback gracieux :
//   - aucun provider configuré → prix null pour tous les symboles (pas de crash).
//   - provider KO → catch → null pour les symboles concernés.
//   - liste de symboles vide → objet vide (200).
//
// Réf : PFT-007, CLAUDE.md (valorisation live côté frontend, secrets server-only).

import { NextResponse } from 'next/server'

import { getPricesWithFallback } from '@evolve/data/prices'

export const runtime = 'nodejs'

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('symbols')
  const symbols = (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (symbols.length === 0) {
    return NextResponse.json({ prices: {} })
  }

  try {
    const prices = await getPricesWithFallback(symbols)
    return NextResponse.json(
      { prices },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
    )
  } catch {
    // Défensif : on ne casse jamais le portefeuille pour un échec de cours.
    // Tous les symboles reviennent null → le frontend bascule sur la valo snapshot DB.
    return NextResponse.json(
      { prices: Object.fromEntries(symbols.map((s) => [s, null])) },
      { status: 200 }
    )
  }
}
