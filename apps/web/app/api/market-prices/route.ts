// GET /api/market-prices?symbols=NASDAQ:META,EURONEXT:MC (PFT-007).
// Server-only : les secrets providers ne transitent jamais côté client. Authentifié (membre)
// pour éviter l'abus de quota providers. Fallback gracieux : aucun provider configuré → prix null.

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@evolve/data'
import { getPricesWithFallback } from '@evolve/data/prices'

export const runtime = 'nodejs'

/** Borne le nombre de symboles par requête (protège le quota des providers). */
const MAX_SYMBOLS = 50

export async function GET(request: Request): Promise<NextResponse> {
  // Auth : la route consomme un quota provider → réservée aux membres connectés.
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('symbols')
  const symbols = (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_SYMBOLS)
  if (symbols.length === 0) {
    return NextResponse.json({ prices: {} })
  }
  try {
    const prices = await getPricesWithFallback(symbols)
    return NextResponse.json(
      { prices },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (err) {
    // Défensif : on ne casse jamais le portefeuille pour un échec de cours.
    console.error('[market-prices] erreur provider:', err)
    return NextResponse.json(
      { prices: Object.fromEntries(symbols.map((s) => [s, null])) },
      { status: 200 }
    )
  }
}
