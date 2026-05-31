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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <DashboardView initialData={initialData} />
    </div>
  )
}
