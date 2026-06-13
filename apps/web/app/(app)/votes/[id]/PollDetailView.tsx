'use client'

// Vue détail membre /votes/[id] (spec §5/§8). Décide entre :
//   - VOTER : vote OUVERT non encore voté → PollVoteSheet (submit via Server Action → submit_vote).
//   - RÉSULTATS : voté (live) ou vote clos → PollResultsView (agrégats anonymes).
//   - EN ATTENTE : voté mais after_close non clôturé → message « résultats à la clôture ».
//
// GA4 : poll_vote_submitted (submit OK), poll_results_viewed (affichage des résultats).
// Les libellés d'options des résultats sont remappés depuis les options du vote (les agrégats
// renvoient des id ; on affiche les labels). Formatage date/pct via @evolve/utils.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import {
  EmptyState,
  PollResultsView,
  PollVoteSheet,
  type PollResultRow,
  type PollVoteValue,
} from '@evolve/ui'
import { formatDate, formatPct } from '@evolve/utils'
import type {
  PollOption,
  PollQuestionType,
  PollResults,
  PollResultsVisibility,
  PollStatus,
} from '@evolve/data'
import { analyticsEvents } from '@/lib/analytics'
import { submitVoteAction } from '../actions'

export interface PollDetailData {
  id: string
  title: string
  description: string | null
  questionType: PollQuestionType
  options: PollOption[]
  status: PollStatus
  resultsVisibility: PollResultsVisibility
  closesAt: string | null
  closedAt: string | null
  hasVoted: boolean
  results: PollResults | null
}

/** Libellé fixe localisé d'une option yes_no (le résultat renvoie l'id yes/no/abstain). */
function yesNoLabel(id: string, t: ReturnType<typeof useTranslations<'votes'>>): string {
  if (id === 'yes') return t('vote.yesNo.yes')
  if (id === 'no') return t('vote.yesNo.no')
  if (id === 'abstain') return t('vote.yesNo.abstain')
  return id
}

export function PollDetailView({ data }: { data: PollDetailData }) {
  const t = useTranslations('votes')
  const locale = useLocale()
  const router = useRouter()

  // Le sheet de vote ne concerne QUE le cas « ouvert + pas voté ».
  const canVote = data.status === 'open' && !data.hasVoted
  const [sheetOpen, setSheetOpen] = useState(canVote)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  // GA4 poll_results_viewed — fire-once quand des résultats sont effectivement affichés.
  const resultsTracked = useRef(false)
  useEffect(() => {
    if (resultsTracked.current || !data.results) return
    resultsTracked.current = true
    analyticsEvents.polls.resultsViewed({ pollId: data.id, pollType: data.questionType })
  }, [data.results, data.id, data.questionType])

  async function handleSubmit(value: PollVoteValue) {
    setErrorCode(null)
    const res = await submitVoteAction({
      pollId: data.id,
      selectedOptions: value.selectedOptions,
      textResponse: value.textResponse,
    })
    if (!res.ok) {
      setErrorCode(res.error)
      // Le sheet attend un reject pour rester en état « error » et conserver la sélection.
      throw new Error(res.error)
    }
    analyticsEvents.polls.voteSubmitted({
      pollId: data.id,
      pollType: data.questionType,
      questionType: data.questionType,
    })
    // Rafraîchit la page (RSC) : le détail bascule sur résultats (live) ou message d'attente.
    router.refresh()
  }

  // ── Résultats (voté/clos) : remappe id → label + calcule les lignes pour PollResultsView ──
  function resultRows(results: PollResults): PollResultRow[] {
    const byId = new Map(data.options.map((o) => [o.id, o.label]))
    return results.options.map((r) => ({
      label:
        data.questionType === 'yes_no' ? yesNoLabel(r.option, t) : (byId.get(r.option) ?? r.option),
      pct: r.pct,
    }))
  }

  const participation = data.results
    ? t('participation.value', {
        voted: data.results.totalResponses,
        total: data.results.totalResponses,
        pct: formatPct(1, { showSign: false }),
      })
    : undefined

  // Cas 1 — sheet de vote (ouvert + pas voté).
  if (canVote) {
    const closesAtLabel = data.closesAt ? formatDate(data.closesAt, locale) : undefined
    return (
      <div className="flex flex-col gap-6">
        <BackLink label={t('detail.backToList')} onClick={() => router.push('/votes')} />
        <PollVoteSheet
          open={sheetOpen}
          onOpenChange={(o) => {
            setSheetOpen(o)
            if (!o) router.push('/votes')
          }}
          title={data.title}
          description={data.description ?? undefined}
          questionType={data.questionType}
          options={data.options}
          resultsVisibility={data.resultsVisibility}
          closesAtLabel={closesAtLabel}
          onSubmit={handleSubmit}
          labels={voteLabels(t, closesAtLabel)}
        />
        {errorCode ? (
          <p role="alert" className="text-[13px] text-data-negative">
            {voteErrorMessage(errorCode, t)}
          </p>
        ) : null}
      </div>
    )
  }

  // Cas 2 — résultats disponibles (voté live ou vote clos avec agrégats).
  if (data.results) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink label={t('detail.backToList')} onClick={() => router.push('/votes')} />
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
            // Template à placeholder `{count}` rempli par PollResultsView (.replace) :
            // on passe la chaîne brute, sinon next-intl tente d'interpoler {count} et lève
            // FORMATTING_ERROR (le composant, pas next-intl, fournit le compte).
            moreResponses: t.raw('results.moreResponses'),
            responsesLabel: t('results.responsesLabel'),
            empty: {
              title: t('results.emptyTitle'),
              description: t('results.emptyDescription'),
            },
          }}
        />
      </div>
    )
  }

  // Cas 3 — voté mais résultats pas encore visibles (after_close non clôturé).
  if (data.hasVoted) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink label={t('detail.backToList')} onClick={() => router.push('/votes')} />
        <EmptyState
          icon="Clock"
          title={t('detail.resultsPendingTitle')}
          description={t('detail.resultsPendingDescription')}
        />
      </div>
    )
  }

  // Cas 4 — résultats indisponibles (vote clos sans agrégat lisible / erreur RPC). Jamais de crash.
  return (
    <div className="flex flex-col gap-6">
      <BackLink label={t('detail.backToList')} onClick={() => router.push('/votes')} />
      <EmptyState
        icon="TriangleAlert"
        title={t('results.unavailableTitle')}
        description={t('results.unavailableDescription')}
      />
    </div>
  )
}

/** Lien retour accessible (bouton stylé en lien — focus visible, ≥ 44px de cible tactile). */
function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-fit min-h-[44px] items-center gap-1.5 text-[14px] font-medium text-text-sec outline-none hover:text-text focus-visible:shadow-[var(--sh-glow)]"
    >
      <span aria-hidden="true">←</span> {label}
    </button>
  )
}

function voteLabels(t: ReturnType<typeof useTranslations<'votes'>>, closesAtLabel?: string) {
  return {
    anonymous: t('vote.anonymous'),
    close: t('vote.close'),
    definitive: t('vote.definitive'),
    multipleHint: t('vote.multipleHint'),
    textAnonymityNote: t('vote.textAnonymityNote'),
    submit: t('vote.submit'),
    sending: t('vote.sending'),
    optionsGroupLabel: t('vote.optionsGroupLabel'),
    yesNo: {
      yes: t('vote.yesNo.yes'),
      no: t('vote.yesNo.no'),
      abstain: t('vote.yesNo.abstain'),
    },
    success: {
      title: t('vote.success.title'),
      subtitle: t('vote.success.subtitle'),
      subtitleLive: t('vote.success.subtitleLive'),
      afterClose: t('vote.success.afterClose', { date: closesAtLabel ?? '—' }),
      loadingLive: t('vote.success.loadingLive'),
      close: t('vote.success.close'),
    },
    error: t('vote.errors.unknown'),
  }
}

function voteErrorMessage(code: string, t: ReturnType<typeof useTranslations<'votes'>>): string {
  switch (code) {
    case 'already_voted':
      return t('vote.errors.already_voted')
    case 'not_open':
      return t('vote.errors.not_open')
    case 'forbidden':
      return t('vote.errors.forbidden')
    case 'too_long':
      return t('vote.errors.too_long')
    case 'unauthorized':
      return t('vote.errors.unauthorized')
    case 'invalid':
      return t('vote.errors.invalid')
    default:
      return t('vote.errors.unknown')
  }
}
