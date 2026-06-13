'use client'

// Vue liste membre /votes (spec §5). Onglets « En cours » / « Clôturés », liste de PollCard,
// EmptyState par onglet. GA4 poll_page_view au montage. Navigation vers /votes/[id] via le
// router (le détail décide : voter ou résultats). Formatage date via @evolve/utils (locale).
//
// PRÉSENTATIONNEL : la copy vient de next-intl ; PollCard reçoit ses labels en props.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { EmptyState, Heading, PollCard, type PollCardStatus } from '@evolve/ui'
import { formatDate } from '@evolve/utils'
import { analyticsEvents } from '@/lib/analytics'
import type { PollQuestionType, PollResultsVisibility, PollStatus } from '@evolve/data'

export interface MemberPollItem {
  id: string
  title: string
  questionType: PollQuestionType
  status: PollStatus
  closesAt: string | null
  closedAt: string | null
  resultsVisibility: PollResultsVisibility
  hasVoted: boolean
}

type Tab = 'open' | 'closed'

export function PollsView({ items }: { items: MemberPollItem[] }) {
  const t = useTranslations('votes')
  const locale = useLocale()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('open')

  // GA4 poll_page_view — fire-once au montage.
  const viewed = useRef(false)
  useEffect(() => {
    if (viewed.current) return
    viewed.current = true
    analyticsEvents.polls.pageView()
  }, [])

  const open = useMemo(() => items.filter((p) => p.status === 'open'), [items])
  const closed = useMemo(() => items.filter((p) => p.status === 'closed'), [items])
  const shown = tab === 'open' ? open : closed

  const tabs: { key: Tab; label: string }[] = [
    { key: 'open', label: t('tabs.open') },
    { key: 'closed', label: t('tabs.closed') },
  ]

  // Statut visuel de la carte (PollCard) : ouvert → voté/à-voter ; clos → closed.
  function cardStatus(p: MemberPollItem): PollCardStatus {
    if (p.status === 'closed') return 'closed'
    return p.hasVoted ? 'voted' : 'to_vote'
  }

  // Résultats consultables : vote clos, ou vote live déjà voté.
  function resultsAvailable(p: MemberPollItem): boolean {
    if (p.status === 'closed') return true
    return p.resultsVisibility === 'live' && p.hasVoted
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Heading level="h1" className="text-[20px]">
          {t('list.title')}
        </Heading>
        <p className="text-[14px] text-text-sec">{t('list.subtitle')}</p>
      </div>

      <div
        role="tablist"
        aria-label={t('list.title')}
        className="flex gap-1 border-b border-border"
      >
        {tabs.map((tb) => {
          const active = tab === tb.key
          return (
            <button
              key={tb.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(tb.key)}
              className={`inline-flex min-h-[44px] items-center border-b-2 px-3 py-3 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] ${
                active
                  ? 'border-brand-yellow text-text'
                  : 'border-transparent text-text-sec hover:text-text'
              }`}
            >
              {tb.label}
            </button>
          )
        })}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon="Vote"
          title={tab === 'open' ? t('list.emptyOpenTitle') : t('list.emptyClosedTitle')}
          description={
            tab === 'open' ? t('list.emptyOpenDescription') : t('list.emptyClosedDescription')
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((p) => {
            const typeLabel = t(`questionType.${p.questionType}`)
            const deadline = p.closesAt
              ? t('deadline.closes', { date: formatDate(p.closesAt, locale) })
              : undefined
            const closedAt = p.closedAt
              ? t('deadline.closedAt', { date: formatDate(p.closedAt, locale) })
              : undefined
            return (
              <li key={p.id}>
                <PollCard
                  title={p.title}
                  status={cardStatus(p)}
                  type={typeLabel}
                  deadline={deadline}
                  closedAt={closedAt}
                  resultsAvailable={resultsAvailable(p)}
                  onVote={() => router.push(`/votes/${p.id}`)}
                  onViewResults={() => router.push(`/votes/${p.id}`)}
                  labels={{
                    toVote: t('card.toVote'),
                    voted: t('card.voted'),
                    closed: t('card.closed'),
                    voteCta: t('card.voteCta'),
                    resultsCta: t('card.resultsCta'),
                    resultsPending: t('card.resultsPending'),
                  }}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
