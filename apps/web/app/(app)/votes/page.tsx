import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient, hasVoted } from '@evolve/data'
import { getMemberPolls, type PollSummary } from '@/lib/data/polls'
import { getSessionUser } from '@/lib/data/request'
import { PollsView, type MemberPollItem } from './PollsView'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('votes.meta')
  return { title: t('listTitle') }
}

export default async function VotesPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  // Identité mémoïsée par requête ; le middleware a déjà revalidé la session.
  const user = await getSessionUser()
  if (!user) return null

  const polls = await getMemberPolls(supabase)

  // « A déjà voté ? » pour chaque vote OUVERT (pilote le badge ✓ et le CTA). On parallélise
  // les checks has_voted (RPC STABLE). Les votes clôturés ne nécessitent pas ce check.
  const openIds = polls.filter((p) => p.status === 'open').map((p) => p.id)
  const votedEntries = await Promise.all(
    openIds.map(async (id) => [id, await hasVoted(supabase, id)] as const)
  )
  const votedMap = new Map<string, boolean>(votedEntries)

  const items: MemberPollItem[] = polls.map((p: PollSummary) => ({
    id: p.id,
    title: p.title,
    questionType: p.questionType,
    status: p.status,
    closesAt: p.closesAt,
    closedAt: p.closedManuallyAt,
    resultsVisibility: p.resultsVisibility,
    hasVoted: p.status === 'open' ? (votedMap.get(p.id) ?? false) : false,
  }))

  return <PollsView items={items} />
}
