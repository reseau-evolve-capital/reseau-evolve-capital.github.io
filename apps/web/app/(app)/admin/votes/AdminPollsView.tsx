'use client'

// Vue admin /admin/votes (spec §6, maquette « 6 · Espace admin /admin/votes — liste »).
// Onglets En cours / Brouillons / Clôturés ; AdminPollRow = titre + méta (type · échéance),
// mini-barre de participation, actions (Voir résultats / Clôturer). CTA « + Nouveau vote ».
// Clôture via Server Action (closePollAction) + router.refresh ; toast de confirmation.
//
// Tokens uniquement ; participation « X/Y · Z % » ou « — » (jamais de NaN). Formatage via
// @evolve/utils (date locale, pct).

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Button, EmptyState, Heading, Icon, useToast } from '@evolve/ui'
import { formatDate, formatPct } from '@evolve/utils'
import type { PollQuestionType, PollStatus } from '@evolve/data'
import { closePollAction } from './actions'

export interface AdminPollItem {
  id: string
  title: string
  questionType: PollQuestionType
  status: PollStatus
  closesAt: string | null
  closedAt: string | null
  /** Nombre de votants si lisible (live / clos), sinon null (« — »). */
  votedCount: number | null
  memberCount: number
}

type Tab = 'open' | 'drafts' | 'closed'

// CTA primaire / secondaire stylés en lien Next (navigation client, focus visible, ≥ 44px).
// On n'utilise pas <Button asChild> (l'atome Button n'expose pas asChild) ni l'atome Link
// (qui rend un <a> non préfetché). Tokens uniquement.
const PRIMARY_LINK =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-brand-yellow px-4 text-[14px] font-semibold text-accent-ink outline-none transition-colors hover:bg-brand-yellow/90 focus-visible:shadow-[var(--sh-glow)]'
const SECONDARY_LINK =
  'inline-flex min-h-[44px] items-center justify-center rounded-md border border-border bg-card px-3 text-[13px] font-semibold text-text outline-none transition-colors hover:bg-card-sub focus-visible:shadow-[var(--sh-glow)]'

export function AdminPollsView({
  items,
  canManage,
}: {
  items: AdminPollItem[]
  /** false = secrétaire (LECTURE SEULE) → « Nouveau vote » et « Clôturer » masqués. */
  canManage: boolean
}) {
  const t = useTranslations('votes.admin')
  const tType = useTranslations('votes.questionType')
  const tDeadline = useTranslations('votes.deadline')
  const tErr = useTranslations('votes.admin')
  const locale = useLocale()
  const router = useRouter()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('open')
  const [pending, startTransition] = useTransition()

  const open = useMemo(() => items.filter((p) => p.status === 'open'), [items])
  const drafts = useMemo(() => items.filter((p) => p.status === 'draft'), [items])
  const closed = useMemo(() => items.filter((p) => p.status === 'closed'), [items])
  const shown = tab === 'open' ? open : tab === 'drafts' ? drafts : closed

  const tabs: { key: Tab; label: string }[] = [
    { key: 'open', label: t('status.open') },
    { key: 'drafts', label: t('status.draft') },
    { key: 'closed', label: t('status.closed') },
  ]

  function handleClose(pollId: string) {
    startTransition(async () => {
      const res = await closePollAction(pollId)
      if (res.ok) {
        toast.success({ title: t('detail.closed') })
        router.refresh()
      } else {
        toast.error({ title: adminErrorMessage(res.error, tErr) })
      }
    })
  }

  const empty = {
    open: { title: t('emptyOpenTitle'), description: t('emptyOpenDescription') },
    drafts: { title: t('emptyDraftsTitle'), description: t('emptyDraftsDescription') },
    closed: { title: t('emptyClosedTitle'), description: t('emptyClosedDescription') },
  }[tab]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Heading level="h1" className="text-[20px]">
            {t('title')}
          </Heading>
          <p className="text-[14px] text-text-sec">{t('subtitle')}</p>
        </div>
        {/* Création d'un vote = ÉCRITURE → masquée pour le secrétaire (lecture seule). */}
        {canManage && (
          <Link href="/admin/votes/nouveau" className={PRIMARY_LINK}>
            <Icon name="Plus" size={16} aria-hidden="true" /> {t('newPoll')}
          </Link>
        )}
      </div>

      {/* Scroll INTERNE (overflow-x-auto) si les onglets dépassent sur mobile : la barre
          d'onglets ne force jamais la largeur de la PAGE (même pattern que AdminTabs). */}
      <div
        role="tablist"
        aria-label={t('title')}
        className="flex gap-1 overflow-x-auto border-b border-border"
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
        <EmptyState icon="Vote" title={empty.title} description={empty.description} />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((p) => (
            <AdminPollRow
              key={p.id}
              item={p}
              typeLabel={tType(p.questionType)}
              deadlineLabel={
                p.status === 'closed'
                  ? p.closedAt
                    ? tDeadline('closedAt', { date: formatDate(p.closedAt, locale) })
                    : undefined
                  : p.closesAt
                    ? tDeadline('closes', { date: formatDate(p.closesAt, locale) })
                    : tDeadline('noDeadline')
              }
              participationLabel={participationText(p)}
              canClose={canManage && p.status === 'open'}
              closing={pending}
              labels={{
                viewResults: t('row.viewResults'),
                close: t('row.close'),
                participation: t('row.participationLabel'),
              }}
              onClose={() => handleClose(p.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

/** Mappe un code d'erreur admin (Server Action) vers un message i18n à clés littérales. */
export function adminErrorMessage(
  code: string,
  t: ReturnType<typeof useTranslations<'votes.admin'>>
): string {
  switch (code) {
    case 'forbidden':
      return t('errors.forbidden')
    case 'invalid':
      return t('errors.invalid')
    case 'invalid_date':
      return t('errors.invalid_date')
    case 'unauthorized':
      return t('errors.unauthorized')
    default:
      return t('errors.unknown')
  }
}

/** « X/Y · Z % » ou « — » si le compte n'est pas lisible. Jamais de NaN. */
function participationText(p: AdminPollItem): string | null {
  if (p.votedCount == null || p.memberCount <= 0) return null
  const pct = formatPct(p.votedCount / p.memberCount, { showSign: false })
  return `${p.votedCount}/${p.memberCount} · ${pct}`
}

interface AdminPollRowProps {
  item: AdminPollItem
  typeLabel: string
  deadlineLabel?: string
  participationLabel: string | null
  canClose: boolean
  closing: boolean
  labels: { viewResults: string; close: string; participation: string }
  onClose: () => void
}

function AdminPollRow({
  item,
  typeLabel,
  deadlineLabel,
  participationLabel,
  canClose,
  closing,
  labels,
  onClose,
}: AdminPollRowProps) {
  // Ratio pour la mini-barre (0..1) — borné, jamais NaN.
  const ratio =
    item.votedCount != null && item.memberCount > 0
      ? Math.min(1, Math.max(0, item.votedCount / item.memberCount))
      : 0

  return (
    <li className="flex flex-col gap-3 rounded-[12px] border border-border bg-card p-4 shadow-[var(--sh-card)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-display text-[15px] font-bold text-text">{item.title}</span>
        <span className="flex flex-wrap items-center gap-2 text-[13px] text-text-sec">
          <span>{typeLabel}</span>
          {deadlineLabel ? (
            <span className="inline-flex items-center gap-1">
              <Icon name="Clock" size={16} aria-hidden="true" />
              {deadlineLabel}
            </span>
          ) : null}
        </span>
      </div>

      {/* `flex-wrap` + `min-w-0` : sur mobile (< 375px) la participation et les actions passent à
          la ligne plutôt que de forcer la largeur de la PAGE (le bloc participation garde 120px min). */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-[120px] flex-col gap-1">
          <span className="text-[12px] font-medium tabular-nums text-text-sec">
            {participationLabel ?? '—'}
          </span>
          <span
            className="h-1.5 w-full overflow-hidden rounded-full bg-card-sub"
            role="presentation"
          >
            <span
              className="block h-full rounded-full bg-brand-yellow"
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link href={`/admin/votes/${item.id}`} className={SECONDARY_LINK}>
            {labels.viewResults}
          </Link>
          {canClose ? (
            <Button variant="secondary" size="sm" onClick={onClose} disabled={closing}>
              {labels.close}
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  )
}
