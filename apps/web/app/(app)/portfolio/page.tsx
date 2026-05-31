import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createServerClient, type Database } from '@evolve/data'
import { getPortfolioData } from '@/lib/data/portfolio'
import { PortfolioView } from './PortfolioView'

type MembershipRow = Database['public']['Tables']['memberships']['Row']

export const metadata: Metadata = { title: 'Portefeuille — Evolve Capital' }

export default async function PortfolioPage() {
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

  const initialData = m?.club_id ? await getPortfolioData(supabase, auth.user.id, m.club_id) : null

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <PortfolioView initialData={initialData} />
    </div>
  )
}
