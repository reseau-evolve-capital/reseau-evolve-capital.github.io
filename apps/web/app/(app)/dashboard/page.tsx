import * as Sentry from '@sentry/nextjs'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { getDashboardData } from '@/lib/data/dashboard'
import { getDashboardChartData, type DashboardChartData } from '@/lib/data/dashboard-chart'
import { DASHBOARD_VARIANT_COOKIE, getDashboardVariant } from '@/lib/experiments/dashboard-v2'
import { getSessionUser, getActiveClubMembership } from '@/lib/data/request'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { DashboardViewV2 } from '@/components/dashboard/DashboardViewV2'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  // Identité via getClaims() (vérif locale du JWT, mémoïsée par requête) : le middleware
  // AUT-005 a DÉJÀ revalidé la session par getUser() réseau — cf. lib/data/request.ts.
  const user = await getSessionUser()
  if (!user) {
    // Le middleware AUT-005 protège déjà la route ; garde-fou défensif.
    return null
  }

  // Lookup memberships mémoïsé par requête — PARTAGÉ avec le layout (app) (ticket C).
  const m = await getActiveClubMembership(user.id)

  const initialData = m?.club_id ? await getDashboardData(supabase, user.id, m.club_id) : null

  // Expérience A/B « Dashboard V2 » — SEUL point de branchement. Précédence :
  // env DASHBOARD_V2_FORCE > cookie QA (lecture seule) > bucket déterministe
  // hashBucket(userId) < DASHBOARD_V2_ROLLOUT (défaut 100 = V2 pour tous depuis le
  // rollout 100 % du 2026-06-12 ; poser 0 = kill-switch retour V1).
  const variantCookie = cookieStore.get(DASHBOARD_VARIANT_COOKIE)?.value ?? null
  const variant = getDashboardVariant(user.id, variantCookie)
  // Ancre des séries demo V2 : date de sync du club, sinon « maintenant » (côté serveur, OK).
  const anchorISO = initialData?.syncedAt ?? new Date().toISOString()

  // Série historique LIVE du graphe V2 (DSH-011/DSH-012) — chargée UNIQUEMENT pour la
  // variante v2 (la V1 ne paie pas la requête). null (aucune ligne REPORTING) ou erreur
  // → le graphe reste en mode demo : la page ne casse JAMAIS pour un problème de chart.
  let chartData: DashboardChartData | null = null
  if (variant === 'v2' && initialData && m?.club_id) {
    try {
      chartData = await getDashboardChartData(supabase, user.id, m.club_id, {
        detentionPct: initialData.detentionPct,
        joinedAt: initialData.member.joinedAt,
      })
    } catch (error) {
      // Log serveur uniquement (jamais à l'écran) — fallback demo assuré par chartData=null.
      Sentry.captureException(error, {
        level: 'warning',
        tags: { endpoint: 'dashboard/chart' },
      })
      console.error('[dashboard] getDashboardChartData a échoué — fallback demo :', error)
    }
  }

  // Le layout (app) fournit padding + centrage + max-w-[1280px] : pas de wrapper ici
  // (sinon double largeur/padding + niveau DOM en trop qui décale le conteneur tactile).
  return variant === 'v2' ? (
    <DashboardViewV2 initialData={initialData} anchorISO={anchorISO} chartData={chartData} />
  ) : (
    <DashboardView initialData={initialData} />
  )
}
