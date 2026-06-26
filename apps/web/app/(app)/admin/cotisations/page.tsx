import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import {
  getClubMembers,
  getClubRawMonths,
  computeRecoveryRate,
  computeEncaisse,
  buildRegulariserList,
  type ClubCotisationsStats,
} from '@/lib/data/admin'
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

  const [members, rawMonths, membership] = await Promise.all([
    getClubMembers(supabase, ctx.clubId),
    getClubRawMonths(supabase, ctx.clubId),
    getActiveClubMembership(user.id),
  ])
  const currency = membership?.clubs?.currency ?? 'EUR'

  // Comptage des mois en retard par membre (pour buildRegulariserList).
  const lateMonthsByMembership = new Map<string, number>()
  for (const m of rawMonths) {
    if (m.status === 'late') {
      lateMonthsByMembership.set(
        m.membership_id,
        (lateMonthsByMembership.get(m.membership_id) ?? 0) + 1
      )
    }
  }

  const clubStats: ClubCotisationsStats = {
    recoveryRate: computeRecoveryRate(rawMonths),
    encaisse: computeEncaisse(rawMonths),
    lateAmount: members.filter((m) => m.isUnpaid).reduce((s, m) => s + m.amountDue, 0),
    lateCount: members.filter((m) => m.isUnpaid).length,
  }

  const regulariserList = buildRegulariserList(members, lateMonthsByMembership)

  return (
    <AdminCotisationsView
      initialData={{
        clubId: ctx.clubId,
        clubStats,
        regulariserList,
        member: null,
      }}
      currency={currency}
      canManage={ctx.canManage}
      members={members.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        netMarketValue: m.netMarketValue,
      }))}
    />
  )
}
