import { cookies } from 'next/headers'
import { createServerClient, type Database } from '@evolve/data'
import { getDashboardData } from '@/lib/data/dashboard'
import { DashboardView } from '@/components/dashboard/DashboardView'

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

  // Le layout (app) fournit padding + centrage + max-w-[1280px] : pas de wrapper ici
  // (sinon double largeur/padding + niveau DOM en trop qui décale le conteneur tactile).
  return <DashboardView initialData={initialData} />
}
