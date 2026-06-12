// Endpoint GET /api/health — statut de santé de la sync Sheets → Postgres.
//
// Consommé par le workflow GitHub Actions `.github/workflows/healthcheck.yml`
// (cron 30 min → alerte Discord si KO). Volontairement PUBLIC et minimal :
//   - aucune donnée membre, aucun secret — uniquement statuts + horodatages
//     (la RPC health_status, migration 035, est SECURITY DEFINER et filtrée) ;
//   - pas d'auth requise : un healthcheck externe doit rester simple.
//
// Convention CLAUDE.md : SUPABASE_SERVICE_ROLE_KEY est INTERDITE dans apps/web →
// client serveur ANON (sans cookies utilisateur) + RPC SECURITY DEFINER.
//
// Statuts :
//   - 200 { status: "ok" }       → sync fraîche (< 180 min) ET aucune feuille en échec
//   - 503 { status: "degraded" } → sync trop vieille OU au moins une feuille `failed`
//   - 503 { status: "down" }     → la RPC elle-même est injoignable / en erreur
//   - reporting_stale (> 7 j)    → WARNING uniquement, jamais un critère d'échec
//     (la série REPORTING peut s'arrêter pour un problème de DONNÉES côté Sheet).

import { NextResponse } from 'next/server'

import { createServerClient } from '@evolve/data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' } as const

/** Payload renvoyé par la RPC health_status() (migration 035). Lecture défensive. */
interface HealthStatusPayload {
  synced_at: string | null
  sync_age_minutes: number | null
  sync_fresh: boolean
  sheets: { sheet_name: string; status: string; synced_at: string }[]
  has_failed_sheet: boolean
  reporting_last_date: string | null
  reporting_stale: boolean
}

export async function GET(): Promise<NextResponse> {
  try {
    // Client anon SANS cookies utilisateur : le healthcheck n'a pas de session.
    const supabase = createServerClient({ getAll: () => [] })
    const { data, error } = await supabase.rpc('health_status')

    if (error || data == null) {
      return NextResponse.json(
        { status: 'down', error: error?.message ?? 'RPC health_status vide.' },
        { status: 503, headers: NO_STORE_HEADERS }
      )
    }

    const payload = data as unknown as HealthStatusPayload
    const ok = payload.sync_fresh === true && payload.has_failed_sheet !== true
    const warnings: string[] = []
    if (payload.reporting_stale === true) {
      warnings.push(
        `reporting_stale : dernière date REPORTING = ${payload.reporting_last_date ?? 'aucune'} (> 7 jours — problème de données côté Sheet, pas un échec de sync).`
      )
    }

    return NextResponse.json(
      { status: ok ? 'ok' : 'degraded', warnings, ...payload },
      { status: ok ? 200 : 503, headers: NO_STORE_HEADERS }
    )
  } catch (e) {
    // Jamais de stack ni de secret dans la réponse — message court uniquement.
    const message = e instanceof Error ? e.message : 'Erreur inconnue.'
    return NextResponse.json(
      { status: 'down', error: message },
      { status: 503, headers: NO_STORE_HEADERS }
    )
  }
}
