import { cookies } from 'next/headers'
import { createServerClient, type Database } from '@evolve/data'
import { getDashboardData } from '@/lib/data/dashboard'
import { DASHBOARD_VARIANT_COOKIE, getDashboardVariant } from '@/lib/experiments/dashboard-v2'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { DashboardViewV2 } from '@/components/dashboard/DashboardViewV2'

type MembershipRow = Database['public']['Tables']['memberships']['Row']

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    // Le middleware AUT-005 protège déjà la route ; garde-fou défensif.
    return null
  }

  const { data: m } = await supabase
    .from('memberships')
    .select('club_id')
    .eq('user_id', auth.user.id)
    .eq('is_active', true)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle<Pick<MembershipRow, 'club_id'>>()

  const initialData = m?.club_id ? await getDashboardData(supabase, auth.user.id, m.club_id) : null

  // Expérience A/B « Dashboard V2 » — SEUL point de branchement. Précédence :
  // env DASHBOARD_V2_FORCE > cookie QA (lecture seule) > bucket déterministe
  // hashBucket(userId) < DASHBOARD_V2_ROLLOUT (défaut 0 = fail-safe V1).
  const variantCookie = cookieStore.get(DASHBOARD_VARIANT_COOKIE)?.value ?? null
  const variant = getDashboardVariant(auth.user.id, variantCookie)
  // Ancre des séries demo V2 : date de sync du club, sinon « maintenant » (côté serveur, OK).
  const anchorISO = initialData?.syncedAt ?? new Date().toISOString()

  // Le layout (app) fournit padding + centrage + max-w-[1280px] : pas de wrapper ici
  // (sinon double largeur/padding + niveau DOM en trop qui décale le conteneur tactile).
  return variant === 'v2' ? (
    <DashboardViewV2 initialData={initialData} anchorISO={anchorISO} />
  ) : (
    <DashboardView initialData={initialData} />
  )
}
