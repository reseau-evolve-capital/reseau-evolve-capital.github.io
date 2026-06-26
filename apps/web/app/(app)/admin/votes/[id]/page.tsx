import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient, getPollResults, type PollResults } from '@evolve/data'
import { getAdminPollById, getActiveMemberCount } from '@/lib/data/polls'
import { getSessionUser, getAdminContext } from '@/lib/data/request'
import { AdminPollDetailView, type AdminPollDetailData } from './AdminPollDetailView'
import { Forbidden } from '../../../admin/Forbidden'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('votes.meta')
  return { title: t('detailTitle') }
}

export default async function AdminVoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const user = await getSessionUser()
  if (!user) return <Forbidden />
  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />

  const poll = await getAdminPollById(supabase, ctx.clubId, id)
  if (!poll) notFound()

  const memberCount = await getActiveMemberCount(supabase, ctx.clubId)

  // Résultats lisibles : clos (toujours) ou live. after_close non clôturé → RPC rejette
  // (pas de bypass) → results null, l'UI propose de clôturer pour révéler les résultats.
  let results: PollResults | null = null
  if (poll.status !== 'draft' && (poll.status === 'closed' || poll.resultsVisibility === 'live')) {
    try {
      results = await getPollResults(supabase, id)
    } catch {
      results = null
    }
  }

  const data: AdminPollDetailData = {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    questionType: poll.questionType,
    options: poll.options,
    status: poll.status,
    resultsVisibility: poll.resultsVisibility,
    closesAt: poll.closesAt,
    closedAt: poll.closedManuallyAt,
    memberCount,
    results,
  }

  return <AdminPollDetailView data={data} canManage={ctx.canManage} />
}
