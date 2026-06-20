import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { getClubContributionsTimeline, getClubMembers } from '@/lib/data/admin'
import { getSessionUser, getAdminContext, getActiveClubMembership } from '@/lib/data/request'
import { AdminCotisationsView } from './AdminCotisationsView'
import { Forbidden } from '../Forbidden'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta')
  return { title: t('cotisationsTitle') }
}

export default async function AdminCotisationsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  // Identité + contexte admin mémoïsés par requête (partagés avec le layout admin) ;
  // le middleware a déjà revalidé la session par getUser() réseau. Cf. lib/data/request.ts.
  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />

  const [timeline, members, membership] = await Promise.all([
    getClubContributionsTimeline(supabase, ctx.clubId, null),
    getClubMembers(supabase, ctx.clubId),
    getActiveClubMembership(user.id),
  ])
  const currency = membership?.clubs?.currency ?? 'EUR'

  return (
    <AdminCotisationsView
      initialData={{ clubId: ctx.clubId, years: timeline.years, stats: timeline.stats }}
      currency={currency}
      members={members.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        netMarketValue: m.netMarketValue,
      }))}
    />
  )
}
