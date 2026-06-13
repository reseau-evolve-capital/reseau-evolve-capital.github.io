import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient, getPollResults, hasVoted, type PollResults } from '@evolve/data'
import { getPollById } from '@/lib/data/polls'
import { getSessionUser } from '@/lib/data/request'
import { PollDetailView, type PollDetailData } from './PollDetailView'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('votes.meta')
  return { title: t('detailTitle') }
}

export default async function VoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const user = await getSessionUser()
  if (!user) return null

  const poll = await getPollById(supabase, id)
  if (!poll) notFound()

  const voted = poll.status === 'open' ? await hasVoted(supabase, id) : true

  // Résultats consultables : vote clos (always), ou vote live ET déjà voté. Sinon on n'appelle
  // PAS la RPC (after_close non clôturé → elle lève « résultats disponibles à la clôture »).
  const resultsVisible = poll.status === 'closed' || (poll.resultsVisibility === 'live' && voted)

  let results: PollResults | null = null
  if (resultsVisible) {
    try {
      results = await getPollResults(supabase, id)
    } catch {
      // Jamais de crash écran : la vue retombe sur l'état « résultats indisponibles ».
      results = null
    }
  }

  const data: PollDetailData = {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    questionType: poll.questionType,
    options: poll.options,
    status: poll.status,
    resultsVisibility: poll.resultsVisibility,
    closesAt: poll.closesAt,
    closedAt: poll.closedManuallyAt,
    hasVoted: voted,
    results,
  }

  return <PollDetailView data={data} />
}
