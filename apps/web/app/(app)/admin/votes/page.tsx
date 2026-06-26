import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient, getPollResults } from '@evolve/data'
import { getAdminPolls, getActiveMemberCount } from '@/lib/data/polls'
import { getSessionUser, getAdminContext } from '@/lib/data/request'
import { AdminPollsView, type AdminPollItem } from './AdminPollsView'
import { Forbidden } from '../../admin/Forbidden'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('votes.meta')
  return { title: t('adminTitle') }
}

export default async function AdminVotesPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const user = await getSessionUser()
  if (!user) return <Forbidden />
  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />

  const [polls, memberCount] = await Promise.all([
    getAdminPolls(supabase, ctx.clubId),
    getActiveMemberCount(supabase, ctx.clubId),
  ])

  // Participation : le total de votants vient de get_poll_results (RPC anonyme). La RPC est
  // gardée par la visibilité (after_close non clôturé → rejet). On ne l'appelle donc que pour
  // les votes dont les résultats sont LISIBLES (clos, ou live) ; sinon participation = null
  // (« — » côté UI). Aucun bypass RLS / service-role.
  const items: AdminPollItem[] = await Promise.all(
    polls.map(async (p): Promise<AdminPollItem> => {
      const resultsReadable = p.status === 'closed' || p.resultsVisibility === 'live'
      let voted: number | null = null
      if (resultsReadable && p.status !== 'draft') {
        try {
          const res = await getPollResults(supabase, p.id)
          voted = res.totalResponses
        } catch {
          voted = null
        }
      }
      return {
        id: p.id,
        title: p.title,
        questionType: p.questionType,
        status: p.status,
        closesAt: p.closesAt,
        closedAt: p.closedManuallyAt,
        votedCount: voted,
        memberCount,
      }
    })
  )

  return <AdminPollsView items={items} canManage={ctx.canManage} />
}
