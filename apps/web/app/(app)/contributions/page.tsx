import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createServerClient, type Database } from '@evolve/data'
import { getContributionsData } from '@/lib/data/contributions'
import { ContributionsView } from './ContributionsView'

type MembershipRow = Database['public']['Tables']['memberships']['Row']

export const metadata: Metadata = { title: 'Mes cotisations — Evolve Capital' }

export default async function ContributionsPage() {
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

  const initialData = m?.club_id
    ? await getContributionsData(supabase, auth.user.id, m.club_id)
    : null

  // Largeur/padding gérés par le layout (app) ; le 2 colonnes desktop vit dans la vue.
  return <ContributionsView initialData={initialData} />
}
