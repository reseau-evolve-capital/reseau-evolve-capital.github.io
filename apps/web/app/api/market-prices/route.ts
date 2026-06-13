// GET /api/market-prices?symbols=NASDAQ:META,EURONEXT:MC (PFT-007).
// Server-only : les secrets providers ne transitent jamais côté client. Authentifié (membre)
// pour éviter l'abus de quota providers. Fallback gracieux : aucun provider configuré → prix null.

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@evolve/data'
import { getPricesWithFallback } from '@evolve/data/prices'

import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'
import { captureRouteError } from '@/lib/monitoring/sentry'

export const runtime = 'nodejs'

/** Borne le nombre de symboles par requête (protège le quota des providers). */
const MAX_SYMBOLS = 50

/** Première IP du chaîne x-forwarded-for, sinon x-real-ip, sinon « unknown ». */
function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export async function GET(request: Request): Promise<NextResponse> {
  // Auth : la route consomme un quota provider → réservée aux membres connectés.
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  // Rate limit : 60 req / min par IP (protège le quota provider) — fail-open via le helper.
  const rl = await checkRateLimit('marketPrices', clientIp(request))
  if (!rl.allowed) {
    return rateLimitedResponse(rl.retryAfterSeconds)
  }

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
    captureRouteError(err, { endpoint: '/api/market-prices', extra: { symbols } })
    return NextResponse.json(
      { prices: Object.fromEntries(symbols.map((s) => [s, null])) },
      { status: 200 }
    )
  }
}
