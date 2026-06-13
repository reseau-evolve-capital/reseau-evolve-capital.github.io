'use client'

// Vue admin détail d'un vote (spec §8) : résultats agrégés (anonymes) + clôture manuelle.
// Réutilise PollResultsView (organism). La clôture passe par closePollAction (Server Action)
// puis router.refresh. Les résultats restent ANONYMES (la RPC ne renvoie jamais de user_id).

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Button, EmptyState, PollResultsView, useToast, type PollResultRow } from '@evolve/ui'
import { formatDate, formatPct } from '@evolve/utils'
import type {
  PollOption,
  PollQuestionType,
  PollResults,
  PollResultsVisibility,
  PollStatus,
} from '@evolve/data'
import { closePollAction } from '../actions'
import { adminErrorMessage } from '../AdminPollsView'

export interface AdminPollDetailData {
  id: string
  title: string
  description: string | null
  questionType: PollQuestionType
  options: PollOption[]
  status: PollStatus
  resultsVisibility: PollResultsVisibility
  closesAt: string | null
  closedAt: string | null
  memberCount: number
  results: PollResults | null
}

function yesNoLabel(id: string, t: ReturnType<typeof useTranslations<'votes'>>): string {
  if (id === 'yes') return t('vote.yesNo.yes')
  if (id === 'no') return t('vote.yesNo.no')
  if (id === 'abstain') return t('vote.yesNo.abstain')
  return id
}

export function AdminPollDetailView({ data }: { data: AdminPollDetailData }) {
  const t = useTranslations('votes')
  const tAdmin = useTranslations('votes.admin')
  const locale = useLocale()
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  function handleClose() {
    if (!window.confirm(tAdmin('detail.closeConfirm'))) return
    startTransition(async () => {
      const res = await closePollAction(data.id)
      if (res.ok) {
        toast.success({ title: tAdmin('detail.closed') })
        router.refresh()
      } else {
        toast.error({ title: adminErrorMessage(res.error, tAdmin) })
      }
    })
  }

  function resultRows(results: PollResults): PollResultRow[] {
    const byId = new Map(data.options.map((o) => [o.id, o.label]))
    return results.options.map((r) => ({
      label:
        data.questionType === 'yes_no' ? yesNoLabel(r.option, t) : (byId.get(r.option) ?? r.option),
      pct: r.pct,
    }))
  }

  const participation =
    data.results && data.memberCount > 0
      ? t('participation.value', {
          voted: data.results.totalResponses,
          total: data.memberCount,
          pct: formatPct(data.results.totalResponses / data.memberCount, { showSign: false }),
        })
      : undefined

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin/votes')}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-medium text-text-sec outline-none hover:text-text focus-visible:shadow-[var(--sh-glow)]"
        >
          <span aria-hidden="true">←</span> {tAdmin('detail.back')}
        </button>
        {data.status === 'open' ? (
          <Button variant="secondary" onClick={handleClose} disabled={pending}>
            {tAdmin('detail.closeManually')}
          </Button>
        ) : null}
      </div>

      {data.status === 'closed' && data.closedAt ? (
        <p className="text-[13px] text-text-ter">
          {t('deadline.closedAt', { date: formatDate(data.closedAt, locale) })}
        </p>
      ) : null}

      {data.results ? (
        <PollResultsView
          title={data.title}
          questionType={data.questionType}
          rows={data.questionType === 'short_text' ? undefined : resultRows(data.results)}
          textResponses={
            data.questionType === 'short_text' ? data.results.textResponses : undefined
          }
          participation={participation}
          labels={{
            results: t('results.results'),
            majority: t('results.majority'),
            multipleHint: t('results.multipleHint'),
            moreResponses: t('results.moreResponses'),
            responsesLabel: t('results.responsesLabel'),
            empty: { title: t('results.emptyTitle'), description: t('results.emptyDescription') },
          }}
        />
      ) : (
        <EmptyState
          icon="Lock"
          title={t('results.unavailableTitle')}
          description={t('results.unavailableDescription')}
        />
      )}
    </div>
  )
}
