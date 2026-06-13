'use client'

// Bannières de vote du dashboard (spec §5). Rendu au-dessus des KPI. Reçoit du RSC les votes
// OUVERTS non encore votés (max 2 bannières « single » ; au-delà, une bannière « aggregate »
// « X votes en attente → Voir tous » vers /votes). GA4 poll_banner_view (au rendu) +
// poll_banner_click (CTA). PRÉSENTATIONNEL : la copy vient de next-intl ; PollBanner reçoit
// ses labels en props. Formatage date via @evolve/utils.

import { useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { PollBanner } from '@evolve/ui'
import { formatDate } from '@evolve/utils'
import type { PollQuestionType } from '@evolve/data'
import { analyticsEvents } from '@/lib/analytics'

export interface DashboardPollItem {
  id: string
  title: string
  questionType: PollQuestionType
  closesAt: string | null
}

const MAX_BANNERS = 2

export function DashboardPollBanners({ polls }: { polls: DashboardPollItem[] }) {
  const t = useTranslations('votes')
  const locale = useLocale()
  const router = useRouter()

  // GA4 poll_banner_view — émis une fois par bannière effectivement rendue.
  const tracked = useRef(false)
  const aggregate = polls.length > MAX_BANNERS
  const shown = useMemo(() => (aggregate ? [] : polls), [aggregate, polls])
  useEffect(() => {
    if (tracked.current || polls.length === 0) return
    tracked.current = true
    if (aggregate) {
      analyticsEvents.polls.bannerView({ pollId: 'aggregate', pollType: 'aggregate' })
    } else {
      for (const p of shown) {
        analyticsEvents.polls.bannerView({ pollId: p.id, pollType: p.questionType })
      }
    }
  }, [polls.length, aggregate, shown])

  if (polls.length === 0) return null

  if (aggregate) {
    return (
      <div className="flex flex-col gap-3">
        <PollBanner
          variant="aggregate"
          count={polls.length}
          onViewAll={() => {
            analyticsEvents.polls.bannerClick({})
            router.push('/votes')
          }}
          labels={{
            viewAllCta: t('banner.viewAllCta'),
            aggregateTitle: t('banner.aggregateTitle', { count: polls.length }),
            aggregateSubtitle: t('banner.aggregateSubtitle'),
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {shown.map((p) => (
        <PollBanner
          key={p.id}
          variant="single"
          title={p.title}
          type={t(`questionType.${p.questionType}`)}
          deadline={
            p.closesAt ? t('deadline.closes', { date: formatDate(p.closesAt, locale) }) : undefined
          }
          onVote={() => {
            analyticsEvents.polls.bannerClick({ pollId: p.id, pollType: p.questionType })
            router.push(`/votes/${p.id}`)
          }}
          labels={{ voteCta: t('banner.voteCta') }}
        />
      ))}
    </div>
  )
}
