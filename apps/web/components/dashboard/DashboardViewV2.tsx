'use client'

// Vue dashboard membre V2 (expérience A/B « Dashboard V2 ») — hero « open » + graphe
// d'évolution DEMO + ruban de métriques (mobile) / colonne position + teaser club (desktop).
//
// Reprend les patterns V1 (DashboardView) : hydratation `initialData` (RSC) + TanStack
// Query, états empty / error identiques, badge stale discret, pull-to-refresh, SyncBanner
// mobile-only. Le graphe est ILLUSTRATIF (séries demo déterministes — pas d'historique réel
// en V0) : le label « Courbe illustrative » reste affiché tant que la source est demo.
// La bascule mobile/desktop passe par les classes (`lg:`) — jamais de JS resize.
//
// Réf : PROMPT-DEV-DASHBOARD-V2-AB, CLAUDE.md (jamais de NaN/undefined, a11y, tokens only).

import { useEffect, useMemo, useRef, useState } from 'react'

import Link from 'next/link'

import { useTranslations, useLocale } from 'next-intl'

import { useQueryClient } from '@tanstack/react-query'

import {
  ContributionStatusCard,
  DashboardEvolutionChart,
  DashboardHero,
  DashboardMetricsRibbon,
  EmptyState,
  Spinner,
  SyncBanner,
  TrendBadge,
  useToast,
  type EvolutionPeriod,
  type TrendBadgeProps,
} from '@evolve/ui'
import { formatEUR, formatPct, formatRelativeTime } from '@evolve/utils'

import { analyticsEvents, valueBucket } from '@/lib/analytics'
import { type DashboardData } from '@/lib/data/dashboard'
import {
  DEMO_CLUB_PORTFOLIO,
  getDemoEvolutionSeries,
  getDemoVariation1d,
} from '@/lib/data/dashboard-chart-demo'
import { useDashboard } from '@/lib/hooks/useDashboard'
import { useSyncStatus } from '@/lib/hooks/useSyncStatus'

import { HeroDetailDialog } from './HeroDetailDialog'

const STALE_MS = 2 * 60 * 60 * 1000 // 2h
const DAY_MS = 86_400_000

/** Post-traite la sortie de formatEUR (source unique du formatage monnaie — CLAUDE.md) :
 *  montant arrondi à l'euro, sans « ,00 » (rendu compact V2 : ruban, deltas, teaser). */
function eurNoCents(value: number): string {
  return formatEUR(Math.round(value)).replace(/,00(?=\s*€)/u, '')
}

/** Signe « + » explicite devant un montant positif (formatEUR ne signe pas). */
function signedEurNoCents(value: number): string {
  return `${value >= 0 ? '+' : ''}${eurNoCents(value)}`
}

/** Label d'axe du graphe : « 19 mars » (localisé) — ou l'année seule pour MAX. */
function axisLabel(dateISO: string, yearOnly: boolean, locale: string): string {
  const d = new Date(dateISO)
  if (Number.isNaN(d.getTime())) return '—'
  if (yearOnly) return String(d.getUTCFullYear())
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(d)
    .replace('.', '')
}

export function DashboardViewV2({
  initialData,
  anchorISO,
}: {
  initialData: DashboardData | null
  /** Date d'ancrage de la série demo (dernier point) — calculée côté RSC (syncedAt ?? now). */
  anchorISO: string
}) {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const toast = useToast()
  // Tous les hooks AVANT tout early return (règle des hooks React) : `data` peut être null
  // sur les états error/empty, donc useSyncStatus reçoit clubId nullable de façon sûre.
  const { data, isError } = useDashboard(initialData)
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [period, setPeriod] = useState<EvolutionPeriod>('30d')
  const startY = useRef<number | null>(null)
  const sync = useSyncStatus(data?.clubId ?? null, {
    toast,
    labels: {
      successTitle: t('sync.success'),
      warningTitle: t('sync.warning'),
      warningMessage: t('sync.warningMessage'),
      errorTitle: t('sync.failed'),
    },
  })
  // `Date.now()` est impur en render (react-hooks/purity) : capture dans un effet, setState
  // via rAF pour éviter le setState synchrone dans l'effet (react-hooks/set-state-in-effect).
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(Date.now()))
    return () => cancelAnimationFrame(raf)
  }, [data?.syncedAt])
  // Analytics (contrat gelé) : dashboard_viewed — fire-once au montage, dès que les données
  // sont prêtes. Valeurs BUCKETISÉES (jamais de montant exact vers GA).
  const viewedRef = useRef(false)
  useEffect(() => {
    if (viewedRef.current || !data) return
    viewedRef.current = true
    analyticsEvents.dashboard.viewed({
      variant: 'v2',
      valueBucket: valueBucket(data.netMarketValue),
      contributionStatus: data.contribution.status,
      chartDataSource: 'demo',
    })
  }, [data])
  // Séries demo déterministes, ancrées sur la quote-part réelle (dernier point = valeur réelle).
  const netMarketValue = data?.netMarketValue ?? 0
  const series = useMemo(
    () => getDemoEvolutionSeries(period, anchorISO, netMarketValue),
    [period, anchorISO, netMarketValue]
  )
  const variation1d = useMemo(
    () => getDemoVariation1d(anchorISO, netMarketValue),
    [anchorISO, netMarketValue]
  )

  async function refresh() {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    setRefreshing(false)
  }

  function onTouchStart(e: React.TouchEvent) {
    if (window.scrollY === 0) startY.current = e.touches[0]?.clientY ?? null
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startY.current == null) return
    const dy = (e.touches[0]?.clientY ?? 0) - startY.current
    if (dy > 70 && !refreshing) {
      startY.current = null
      void refresh()
    }
  }

  function openDetail() {
    analyticsEvents.dashboard.heroDetailOpened({ variant: 'v2' })
    setDetailOpen(true)
  }

  function onPeriodChange(p: EvolutionPeriod) {
    setPeriod(p)
    analyticsEvents.dashboard.chartPeriodChanged({ period: p, chartDataSource: 'demo' })
  }

  if (isError) {
    return (
      <EmptyState
        icon="TriangleAlert"
        title={t('error.title')}
        description={tCommon('dataSafe')}
        action={{ label: tCommon('retry'), onClick: () => void refresh() }}
      />
    )
  }
  if (!data) {
    return (
      <EmptyState icon="Calendar" title={t('empty.title')} description={t('empty.description')} />
    )
  }

  const stale =
    now != null && data?.syncedAt ? now - new Date(data.syncedAt).getTime() > STALE_MS : false

  const syncError = sync.isError
    ? sync.error.message === 'rate_limited'
      ? t('sync.rateLimited')
      : t('sync.failed')
    : null

  // ── Dérivations d'affichage (formatters @evolve/utils, fr-FR par défaut — I18N-001) ──
  const isMax = period === 'max'
  const firstPoint = series.points[0]
  const lastPoint = series.points[series.points.length - 1]
  const periodItems: Array<{ value: EvolutionPeriod; label: string; mobileHidden?: boolean }> = [
    { value: '7d', label: t('evolution.periods.7d'), mobileHidden: true },
    { value: '30d', label: t('evolution.periods.30d') },
    { value: '90d', label: t('evolution.periods.90d'), mobileHidden: true },
    { value: '1y', label: t('evolution.periods.1y'), mobileHidden: true },
    { value: 'max', label: t('evolution.periods.max') },
  ]
  const chartShared = {
    points: series.points,
    period,
    onPeriodChange,
    periods: periodItems,
    summaryValue: signedEurNoCents(series.deltaEur),
    summarySub: `(${formatPct(series.deltaPct / 100)})`,
    summarySuffix: isMax ? t('evolution.sinceJoin') : undefined,
    title: t('evolution.title'),
    axisStart: firstPoint ? axisLabel(firstPoint.date, isMax, locale) : '—',
    axisEnd: lastPoint ? axisLabel(lastPoint.date, isMax, locale) : '—',
    direction: (series.deltaEur >= 0 ? 'up' : 'down') as 'up' | 'down',
    demoLabel: t('evolution.demoLabel'),
    periodGroupLabel: t('evolution.periodGroup'),
  }

  // Variation « depuis hier » du hero — demo, toujours haussière par construction.
  const heroVariation: TrendBadgeProps = {
    direction: 'up',
    value: formatPct(variation1d.percent / 100),
    subValue: signedEurNoCents(variation1d.amount),
  }
  const yesterday = new Date(new Date(anchorISO).getTime() - DAY_MS)
  const variationMeta = t('v2.heroMetaYesterday', {
    date: Number.isNaN(yesterday.getTime())
      ? '—'
      : new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
          .format(yesterday)
          .replace(/\//g, '.'),
  })

  // Ruban mobile — 3 colonnes constantes : capacité absente → « — » (jamais de trou).
  const ribbonItems = [
    { label: t('kpi.detention'), value: formatPct(data.detentionPct, { showSign: false }) },
    { label: t('kpi.totalContributed'), value: eurNoCents(data.totalContributed) },
    {
      label: t('capacity.title'),
      value: data.investment.remaining != null ? eurNoCents(data.investment.remaining) : '—',
    },
  ]

  return (
    <div className="flex flex-col gap-4" onTouchStart={onTouchStart} onTouchMove={onTouchMove}>
      {refreshing && (
        <div className="flex items-center justify-center gap-2 text-[13px] text-text-sec py-1">
          <Spinner size={16} /> {tCommon('refreshing')}
        </div>
      )}
      {stale && data.syncedAt && (
        <p className="text-[12px] text-text-ter">
          {t('stale', { time: formatRelativeTime(data.syncedAt, undefined, locale) })}
        </p>
      )}
      {/* Le statut de sync est déjà porté par la topbar du shell sur desktop. */}
      <div className="md:hidden">
        <SyncBanner
          syncedAt={data.syncedAt}
          locale={locale}
          userRole={data.member.role}
          isSyncing={sync.isPending}
          onSync={() => sync.mutate()}
          errorMessage={syncError}
          syncedAtTemplate={(time) => t('syncBanner.syncedAt', { time })}
          neverSyncedLabel={t('syncBanner.neverSynced')}
          refreshLabel={t('syncBanner.refresh')}
          refreshAriaLabel={t('syncBanner.refreshAria')}
        />
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[58fr_42fr] lg:items-start lg:gap-10">
        {/* ── Colonne gauche : hero « open » + graphe d'évolution ── */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Hero mobile : tout le bloc est cliquable (ouvre le détail quote-part). */}
          <DashboardHero
            className="lg:hidden"
            appearance="open"
            netMarketValue={data.netMarketValue}
            variation={heroVariation}
            variationMeta={variationMeta}
            onClick={openDetail}
            label={t('hero.label')}
            detailLabel={t('hero.viewDetail')}
            accessibleNameTemplate={(amount) => t('hero.aria', { amount })}
          />
          {/* Hero desktop : non cliquable — le lien « Comprendre ma quote-part » ouvre le
              détail (évite un bouton imbriqué dans un bouton, invalide en HTML/a11y). */}
          <DashboardHero
            className="hidden lg:flex"
            appearance="open"
            netMarketValue={data.netMarketValue}
            variation={heroVariation}
            variationMeta={variationMeta}
            label={t('hero.label')}
            action={
              <button
                type="button"
                onClick={openDetail}
                className="border-b border-accent pb-px text-[13px] font-semibold text-text outline-none hover:bg-accent hover:text-accent-ink focus-visible:shadow-[var(--sh-glow)] motion-safe:transition-colors motion-safe:duration-[var(--dur-fast)]"
              >
                {t('v2.understand')} <span aria-hidden="true">→</span>
              </button>
            }
          />
          {/* Graphe : compact (mobile, 30J|MAX visibles) / large (desktop, 5 périodes). */}
          <DashboardEvolutionChart {...chartShared} className="lg:hidden" size="compact" />
          <DashboardEvolutionChart
            {...chartShared}
            className="hidden lg:block"
            size="large"
            axisCenter={periodItems.find((p) => p.value === period)?.label}
          />
        </div>

        {/* ── Colonne droite : statut cotisation + position (desktop) + teaser club ── */}
        <div className="flex min-w-0 flex-col gap-4">
          <ContributionStatusCard
            variant="compact"
            status={data.contribution.status}
            title={t('kpi.contributionStatus')}
            statusLabel={t(`statusValue.${data.contribution.status}`)}
            message={t(`contributionMessage.${data.contribution.status}`)}
            amountDueLabel={
              data.contribution.amountDue > 0 ? formatEUR(data.contribution.amountDue) : null
            }
          />

          {/* Ruban de métriques — mobile uniquement (le desktop a la card « Ma position »). */}
          <DashboardMetricsRibbon className="lg:hidden" items={ribbonItems} />

          {/* Card « Ma position » — desktop, valeurs COMPLÈTES (centimes inclus). */}
          <section className="hidden rounded-[10px] border border-border bg-card px-4 py-3 shadow-[var(--sh-card)] lg:block">
            <p className="font-mono text-[10px] uppercase tracking-[0.10em] text-text-ter">
              {t('v2.position')}
            </p>
            <dl className="mt-1">
              <div className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-[13px] text-text-sec">{t('kpi.detention')}</dt>
                <dd className="font-display text-[17px] font-bold tabular-nums text-text">
                  {formatPct(data.detentionPct, { showSign: false })}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-border py-2">
                <dt className="text-[13px] text-text-sec">{t('kpi.totalContributed')}</dt>
                <dd className="font-display text-[17px] font-bold tabular-nums text-text">
                  {formatEUR(data.totalContributed)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-border py-2">
                <dt className="text-[13px] text-text-sec">{t('capacity.title')}</dt>
                <dd className="font-display text-[17px] font-bold tabular-nums text-text">
                  {data.investment.remaining != null ? formatEUR(data.investment.remaining) : '—'}
                </dd>
              </div>
            </dl>
          </section>

          {/* Teaser « Portefeuille du club » — desktop. Card entière cliquable (Link →
              cursor géré par la règle globale a[href]). Valorisation DEMO : la valeur club
              réelle n'est pas exposée aux membres en V0 (/api/admin/* est réservé staff). */}
          <Link
            href="/portfolio"
            className="group hidden flex-col gap-1 rounded-[10px] border border-border bg-card px-4 py-3 shadow-[var(--sh-card)] outline-none hover:border-accent focus-visible:shadow-[var(--sh-glow)] motion-safe:transition-colors motion-safe:duration-[var(--dur-fast)] lg:flex"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.10em] text-text-ter">
              {t('v2.club.title')}
            </p>
            <p className="text-[13px] text-text-sec">{data.club.name}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[22px] font-bold tabular-nums text-text">
                {eurNoCents(DEMO_CLUB_PORTFOLIO.totalValuation)}
              </span>
              <TrendBadge
                direction="up"
                value={formatPct(DEMO_CLUB_PORTFOLIO.variation1dPercent / 100)}
              />
            </div>
            <span className="mt-1 text-[13px] font-semibold text-text group-hover:underline">
              {t('v2.club.viewDetail')} <span aria-hidden="true">→</span>
            </span>
          </Link>
        </div>
      </div>

      <HeroDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        netMarketValue={data.netMarketValue}
        detentionPct={data.detentionPct}
        clubName={data.club.name}
        syncedAt={data.syncedAt}
      />
    </div>
  )
}
