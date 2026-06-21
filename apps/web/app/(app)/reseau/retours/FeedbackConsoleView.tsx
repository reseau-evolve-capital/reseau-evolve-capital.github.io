'use client'

// Console feedbacks RÉSEAU (NET-019, écran /reseau/retours).
//
// Composition (cf. PROMPT-DESIGN-feedback-console.md, écrans 01/01-B/03) :
//   A. En-tête : titre + sous-titre + sélecteur de période.
//   B. Panneau « Synthèse IA » = ComingSoonCard (le digest IA agrégé arrive en NET-C/NET-017).
//   C. Bandeau KPI : Retours · Bugs (dont bloquants) · Idées · Taux de traitement.
//   D. Mini-dataviz : donut « Par catégorie » + barres « Volume par club ».
//   E. Barre de filtres : Type · Sévérité · Statut · Club · recherche.
//   F. Tableau (style MembersList) : Retour (titre IA) · Type · Sévérité · Club · Membre · Date · Statut.
//   G. États empty / loading / error explicites (jamais NaN/undefined → « — »).
//   + Slide-over détail (écran 03) au clic sur une ligne.
//
// Présentationnel + état local (filtres en mémoire). La période recharge la page (query param)
// — les données sont chargées côté serveur (RLS membre réseau). Le changement de statut appelle
// la Server Action updateFeedbackStatusAction (RLS), puis router.refresh().
//
// Tokens uniquement (sévérité bloquant = data-negative, gênant = data-warning, jamais rouge brand).
// Formatage via @evolve/utils ; i18n via next-intl ; a11y AA.

import { useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { formatPct, formatRelativeTime } from '@evolve/utils'
import {
  Heading,
  Text,
  Icon,
  Badge,
  ComingSoonCard,
  EmptyState,
  type BadgeVariant,
} from '@evolve/ui'
import type {
  NetworkFeedbackPayload,
  FeedbackItem,
  FeedbackType,
  FeedbackSeverity,
  FeedbackStatus,
} from '@/lib/data/feedback'
import {
  OTHER_CATEGORY_KEY,
  NO_CLUB_KEY,
  FEEDBACK_STATUSES,
  filterFeedback,
} from '@/lib/data/feedback'
import { updateFeedbackStatusAction } from './actions'
import { CategoryDonut } from './CategoryDonut'
import { ClubVolumeBars } from './ClubVolumeBars'
import { FeedbackDetailSheet } from './FeedbackDetailSheet'

export type FeedbackPeriod = '30d' | '90d' | 'all'

const TYPE_BADGE: Record<FeedbackType, BadgeVariant> = {
  bug: 'neutral',
  feature: 'brand',
  question: 'neutral',
}
const SEVERITY_BADGE: Record<FeedbackSeverity, BadgeVariant> = {
  blocking: 'error',
  annoying: 'warning',
  minor: 'neutral',
}

export function FeedbackConsoleView({
  initialData,
  period,
}: {
  initialData: NetworkFeedbackPayload
  period: FeedbackPeriod
}) {
  const t = useTranslations('reseau.retours')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const { items, clubs, kpis, byCategory, byClub } = initialData

  // ── Filtres locaux (en mémoire) ────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<FeedbackSeverity | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all')
  const [clubFilter, setClubFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<FeedbackItem | null>(null)

  const localeTag = locale === 'fr' ? 'fr-FR' : 'en-US'
  const categoryLabel = (key: string) => (key === OTHER_CATEGORY_KEY ? t('category.other') : key)
  const clubLabel = (name: string) => (name === NO_CLUB_KEY ? t('table.noClub') : name)

  const filtered = useMemo(
    () =>
      filterFeedback(items, {
        type: typeFilter,
        severity: severityFilter,
        status: statusFilter,
        club: clubFilter,
        search,
      }),
    [items, typeFilter, severityFilter, statusFilter, clubFilter, search]
  )

  const setPeriod = (next: FeedbackPeriod) => {
    const params = new URLSearchParams(searchParams?.toString())
    params.set('periode', next)
    router.push(`/reseau/retours?${params.toString()}`)
  }

  const onStatusChange = (item: FeedbackItem, next: FeedbackStatus) => {
    startTransition(async () => {
      const res = await updateFeedbackStatusAction(item.id, next)
      if (res.ok) {
        router.refresh()
        // Reflète immédiatement dans le slide-over ouvert le cas échéant.
        setSelected((cur) => (cur && cur.id === item.id ? { ...cur, status: next } : cur))
      }
    })
  }

  const donutData = byCategory.map((c) => ({ label: categoryLabel(c.category), count: c.count }))
  const barsData = byClub.map((c) => ({ label: clubLabel(c.clubName), count: c.count }))

  return (
    <div className="flex flex-col gap-6">
      {/* A. En-tête + période ------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Heading level="h1" className="text-[20px]">
            {t('title')}
          </Heading>
          <Text className="text-[14px] text-text-sec">{t('subtitle')}</Text>
        </div>
        <label className="inline-flex items-center gap-2 text-[13px] text-text-sec">
          <span>{t('period.label')}</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as FeedbackPeriod)}
            className="min-h-[44px] rounded-[10px] border border-border bg-card px-3 text-[14px] text-text focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
          >
            <option value="30d">{t('period.30d')}</option>
            <option value="90d">{t('period.90d')}</option>
            <option value="all">{t('period.all')}</option>
          </select>
        </label>
      </div>

      {/* B. Panneau « Synthèse IA » = Bientôt (pas de faux résumé) ------------- */}
      <ComingSoonCard
        title={t('aiDigest.title')}
        description={t('aiDigest.description')}
        badgeLabel={t('aiDigest.badge')}
        withSkeleton
      />

      {/* C. Bandeau KPI ------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile title={t('kpi.total')} value={String(kpis.total)} icon="MessageSquare" />
        <KpiTile
          title={t('kpi.bugs')}
          value={String(kpis.bugs)}
          icon="Bug"
          subtitle={
            kpis.blockingBugs > 0 ? (
              <Badge variant="error">{t('kpi.blocking', { count: kpis.blockingBugs })}</Badge>
            ) : undefined
          }
        />
        <KpiTile title={t('kpi.ideas')} value={String(kpis.ideas)} icon="Lightbulb" />
        <KpiTile
          title={t('kpi.treatmentRate')}
          value={
            kpis.treatmentRate == null ? '—' : formatPct(kpis.treatmentRate, { showSign: false })
          }
          icon="CircleCheck"
          accent={kpis.treatmentRate != null}
        />
      </div>

      {/* D. Mini-dataviz ------------------------------------------------------ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section
          aria-label={t('dataviz.byCategory')}
          className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--sh-card)]"
        >
          <h2 className="mb-4 font-display text-[15px] font-extrabold text-text">
            {t('dataviz.byCategory')}
          </h2>
          {donutData.length > 0 ? (
            <CategoryDonut
              data={donutData}
              ariaLabelPrefix={t('dataviz.byCategoryAria')}
              legendLabel={t('dataviz.legend')}
              totalLabel={t('dataviz.donutTotal')}
            />
          ) : (
            <Text className="text-[13px] text-text-ter">{t('dataviz.empty')}</Text>
          )}
        </section>
        <section
          aria-label={t('dataviz.byClub')}
          className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--sh-card)]"
        >
          <h2 className="mb-4 font-display text-[15px] font-extrabold text-text">
            {t('dataviz.byClub')}
          </h2>
          {barsData.length > 0 ? (
            <ClubVolumeBars data={barsData} ariaLabel={t('dataviz.byClubAria')} />
          ) : (
            <Text className="text-[13px] text-text-ter">{t('dataviz.empty')}</Text>
          )}
        </section>
      </div>

      {/* E. Barre de filtres -------------------------------------------------- */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label={t('filters.group')}
      >
        <FilterSelect
          label={t('filters.type')}
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as FeedbackType | 'all')}
          options={[
            { value: 'all', label: t('filters.allTypes') },
            { value: 'bug', label: t('type.bug') },
            { value: 'feature', label: t('type.feature') },
            { value: 'question', label: t('type.question') },
          ]}
        />
        <FilterSelect
          label={t('filters.severity')}
          value={severityFilter}
          onChange={(v) => setSeverityFilter(v as FeedbackSeverity | 'all')}
          options={[
            { value: 'all', label: t('filters.allSeverities') },
            { value: 'blocking', label: t('severity.blocking') },
            { value: 'annoying', label: t('severity.annoying') },
            { value: 'minor', label: t('severity.minor') },
          ]}
        />
        <FilterSelect
          label={t('filters.status')}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as FeedbackStatus | 'all')}
          options={[
            { value: 'all', label: t('filters.allStatuses') },
            ...FEEDBACK_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })),
          ]}
        />
        <FilterSelect
          label={t('filters.club')}
          value={clubFilter}
          onChange={setClubFilter}
          options={[
            { value: 'all', label: t('filters.allClubs') },
            ...clubs.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <label className="relative flex-1 min-w-[180px]">
          <span className="sr-only">{t('filters.search')}</span>
          <Icon
            name="Search"
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-ter"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('filters.searchPlaceholder')}
            className="min-h-[44px] w-full rounded-[10px] border border-border bg-card pl-9 pr-3 text-[14px] text-text placeholder:text-text-ter focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
          />
        </label>
      </div>

      {/* F. Tableau ----------------------------------------------------------- */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="MessageSquare"
          title={t('table.empty.title')}
          description={t('table.empty.description')}
        />
      ) : (
        <FeedbackTable
          items={filtered}
          locale={localeTag}
          isPending={isPending}
          onSelect={setSelected}
          onStatusChange={onStatusChange}
          clubLabel={clubLabel}
          t={t}
        />
      )}

      {/* Slide-over détail (écran 03) ---------------------------------------- */}
      <FeedbackDetailSheet
        item={selected}
        open={selected != null}
        onOpenChange={(open) => !open && setSelected(null)}
        onStatusChange={onStatusChange}
        locale={localeTag}
        clubLabel={clubLabel}
      />
    </div>
  )
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function KpiTile({
  title,
  value,
  icon,
  subtitle,
  accent = false,
}: {
  title: string
  value: string
  icon: Parameters<typeof Icon>[0]['name']
  subtitle?: React.ReactNode
  accent?: boolean
}) {
  return (
    <div className="rounded-[10px] border border-border bg-card p-4 shadow-[var(--sh-card)] sm:p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-[13px] font-bold text-text">{title}</p>
        <Icon name={icon} size={20} className="text-text-ter" aria-hidden="true" />
      </div>
      <p
        className={`font-display text-[24px] font-[800] leading-none [font-feature-settings:'tnum'] ${
          accent ? 'text-data-positive' : 'text-text'
        }`}
      >
        {value}
      </p>
      {subtitle ? <div className="mt-2">{subtitle}</div> : null}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-[13px]">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[44px] rounded-[10px] border border-border bg-card px-3 text-[14px] text-text focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

type TFn = ReturnType<typeof useTranslations>

function FeedbackTable({
  items,
  locale,
  isPending,
  onSelect,
  onStatusChange,
  clubLabel,
  t,
}: {
  items: FeedbackItem[]
  locale: string
  isPending: boolean
  onSelect: (item: FeedbackItem) => void
  onStatusChange: (item: FeedbackItem, next: FeedbackStatus) => void
  clubLabel: (name: string) => string
  t: TFn
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse" aria-label={t('table.tableLabel')}>
        <thead>
          <tr className="border-b border-border">
            {(['feedback', 'type', 'severity', 'club', 'member', 'date', 'status'] as const).map(
              (c) => (
                <th
                  key={c}
                  scope="col"
                  className="px-3 py-2 text-left text-[12px] font-semibold text-text-ter first:pl-0"
                >
                  {t(`table.columns.${c}`)}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              data-testid="feedback-row"
              className="border-b border-border align-middle hover:bg-card-sub/40"
            >
              {/* Retour : titre IA cliquable (ouvre le slide-over) + message tronqué + 📎. */}
              <td className="px-3 py-3 first:pl-0">
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="flex flex-col gap-0.5 text-left focus:outline-none focus-visible:shadow-[var(--sh-glow)] rounded"
                >
                  <span className="flex items-center gap-1.5 font-semibold text-text">
                    <span className="line-clamp-1">{item.aiTitle ?? t('table.untitled')}</span>
                    {item.screenshotUrls.length > 0 && (
                      <Icon
                        name="Paperclip"
                        size={16}
                        className="h-3.5 w-3.5 text-text-ter"
                        aria-label={t('table.hasAttachments')}
                      />
                    )}
                  </span>
                  <span className="line-clamp-1 max-w-[40ch] text-[12px] text-text-ter">
                    {item.message}
                  </span>
                </button>
              </td>
              {/* Type */}
              <td className="px-3 py-3">
                <Badge variant={TYPE_BADGE[item.type]}>{t(`type.${item.type}`)}</Badge>
              </td>
              {/* Sévérité */}
              <td className="px-3 py-3">
                {item.severity ? (
                  <Badge variant={SEVERITY_BADGE[item.severity]}>
                    {t(`severity.${item.severity}`)}
                  </Badge>
                ) : (
                  <span aria-hidden="true" className="text-text-ter">
                    —
                  </span>
                )}
              </td>
              {/* Club */}
              <td className="px-3 py-3 text-[13px] text-text-sec">
                {item.clubName ? clubLabel(item.clubName) : t('table.noClub')}
              </td>
              {/* Membre (prénom RGPD) */}
              <td className="px-3 py-3 text-[13px] text-text-sec">{item.authorName}</td>
              {/* Date relative */}
              <td className="px-3 py-3 text-[13px] text-text-ter whitespace-nowrap">
                {formatRelativeTime(item.createdAt, new Date(), locale)}
              </td>
              {/* Statut (select inline) */}
              <td className="px-3 py-3">
                <label className="inline-flex items-center">
                  <span className="sr-only">{t('table.changeStatus')}</span>
                  <select
                    value={item.status}
                    disabled={isPending}
                    onChange={(e) => onStatusChange(item, e.target.value as FeedbackStatus)}
                    aria-label={t('table.changeStatus')}
                    className="min-h-[44px] rounded-[10px] border border-border bg-card px-2 text-[13px] text-text focus:outline-none focus-visible:shadow-[var(--sh-glow)] disabled:opacity-50"
                  >
                    {FEEDBACK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`status.${s}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
