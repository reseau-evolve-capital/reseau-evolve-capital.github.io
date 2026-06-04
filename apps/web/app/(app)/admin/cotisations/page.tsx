import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { resolveAdminContext, getClubContributionsTimeline, getClubMembers } from '@/lib/data/admin'
import { AdminCotisationsView } from './AdminCotisationsView'
import { Forbidden } from '../Forbidden'

export const metadata: Metadata = { title: 'Cotisations — Admin Evolve Capital' }

export default async function AdminCotisationsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return <Forbidden />

  const ctx = await resolveAdminContext(supabase, user.id)
  if (!ctx) return <Forbidden />

  const [timeline, members] = await Promise.all([
    getClubContributionsTimeline(supabase, ctx.clubId, null),
    getClubMembers(supabase, ctx.clubId),
  ])

  return (
    <AdminCotisationsView
      initialData={{ clubId: ctx.clubId, years: timeline.years, stats: timeline.stats }}
      members={members.map((m) => ({ id: m.id, fullName: m.fullName }))}
    />
  )
}
