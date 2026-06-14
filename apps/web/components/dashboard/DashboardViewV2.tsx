'use client'

// Vue dashboard membre V2 (expérience A/B « Dashboard V2 ») — hero « open » + graphe
// d'évolution + ruban de métriques (mobile) / colonne position + teaser club (desktop).
//
// Reprend les patterns V1 (DashboardView) : hydratation `initialData` (RSC) + TanStack
// Query, états empty / error identiques, badge stale discret, pull-to-refresh, SyncBanner
// mobile-only. La bascule mobile/desktop passe par les classes (`lg:`) — jamais de JS resize.
//
// DEUX MODES de graphe (DSH-012) :
//   - LIVE  : `chartData` non-null (série REPORTING réelle, DSH-011) → filtrage par période
//     côté client (slicePeriod), résumé summarize, downsample ≤ 400 points ; TrendBadge hero
//     branché sur variations.d1 (null → pas de badge — jamais de NaN). Pas de label demo.
//   - DEMO  : `chartData` null (aucune ligne REPORTING / erreur serveur) → séries demo
//     déterministes ILLUSTRATIVES, comportement historique STRICTEMENT inchangé, label
//     « Courbe illustrative » affiché. Le teaser club desktop reste demo dans les deux modes.
//
// Réf : PROMPT-DEV-DASHBOARD-V2-AB, DSH-011/DSH-012, CLAUDE.md (jamais de NaN, a11y, tokens).

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
  InfoTip,
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
// Import type-only : dashboard-chart.ts est un module serveur (requêtes Supabase) — seul
// son CONTRAT est consommé ici, effacé à la compilation (aucun code serveur dans le bundle).
import type { DashboardChartData } from '@/lib/data/dashboard-chart'
import {
  DEMO_CLUB_PORTFOLIO,
  getDemoEvolutionSeries,
  getDemoVariation1d,
} from '@/lib/data/dashboard-chart-demo'
import { downsample, slicePeriod, summarize } from '@/lib/data/dashboard-chart-view'
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
  chartData = null,
}: {
  initialData: DashboardData | null
  /** Date d'ancrage de la série demo (dernier point) — calculée côté RSC (syncedAt ?? now). */
  anchorISO: string
  /** Série historique live (DSH-011, RSC) — null = mode demo (fallback illustratif). */
  chartData?: DashboardChartData | null
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
  // Source du graphe : live dès que la série REPORTING est fournie, demo sinon (DSH-012).
  const chartSource: 'live' | 'demo' = chartData ? 'live' : 'demo'
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
      chartDataSource: chartSource,
    })
  }, [data, chartSource])
  // Séries demo déterministes, ancrées sur la quote-part réelle (dernier point = valeur
  // réelle). Calculées UNIQUEMENT en mode demo (null en live — pas de travail inutile).
  const netMarketValue = data?.netMarketValue ?? 0
  const series = useMemo(
    () => (chartData ? null : getDemoEvolutionSeries(period, anchorISO, netMarketValue)),
    [chartData, period, anchorISO, netMarketValue]
  )
  const variation1d = useMemo(
    () => (chartData ? null : getDemoVariation1d(anchorISO, netMarketValue)),
    [chartData, anchorISO, netMarketValue]
  )
  // Mode LIVE : slice calendaire de la période active (résumé/axes sur le slice ENTIER),
  // puis downsample ≤ 400 points pour le tracé (premier/dernier points conservés).
  const liveSlice = useMemo(
    () => (chartData ? slicePeriod(chartData.series, period) : null),
    [chartData, period]
  )
  const livePoints = useMemo(() => (liveSlice ? downsample(liveSlice) : null), [liveSlice])
  const liveSummary = useMemo(() => (liveSlice ? summarize(liveSlice) : null), [liveSlice])

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
    analyticsEvents.dashboard.chartPeriodChanged({ period: p, chartDataSource: chartSource })
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
  // Données du graphe selon le mode (live prioritaire, demo fallback strictement inchangé).
  // LIVE : résumé sur le slice COMPLET (deltaPct = fraction → formatPct direct) ; résumé
  // null (< 2 points / base ≤ 0) → « — » (le chart affiche déjà « — » sous 2 points) ;
  // pas de label « Courbe illustrative ». DEMO : deltaPct en % → ÷ 100 avant formatPct.
  const demoPoints = series?.points ?? []
  const chart =
    chartData && livePoints && liveSlice
      ? {
          points: livePoints,
          summaryValue: liveSummary ? signedEurNoCents(liveSummary.deltaEur) : '—',
          summarySub: liveSummary ? `(${formatPct(liveSummary.deltaPct)})` : '',
          direction: (liveSummary && liveSummary.deltaEur < 0 ? 'down' : 'up') as 'up' | 'down',
          firstDate: liveSlice[0]?.date ?? null,
          lastDate: liveSlice[liveSlice.length - 1]?.date ?? null,
          demoLabel: undefined,
        }
      : {
          points: demoPoints,
          summaryValue: signedEurNoCents(series?.deltaEur ?? 0),
          summarySub: `(${formatPct((series?.deltaPct ?? 0) / 100)})`,
          direction: ((series?.deltaEur ?? 0) >= 0 ? 'up' : 'down') as 'up' | 'down',
          firstDate: demoPoints[0]?.date ?? null,
          lastDate: demoPoints[demoPoints.length - 1]?.date ?? null,
          demoLabel: t('evolution.demoLabel'),
        }
  const periodItems: Array<{ value: EvolutionPeriod; label: string; mobileHidden?: boolean }> = [
    { value: '7d', label: t('evolution.periods.7d'), mobileHidden: true },
    { value: '30d', label: t('evolution.periods.30d') },
    { value: '90d', label: t('evolution.periods.90d'), mobileHidden: true },
    { value: '1y', label: t('evolution.periods.1y'), mobileHidden: true },
    { value: 'max', label: t('evolution.periods.max') },
  ]
  // Noms longs de période (titre desktop « Évolution · 30 jours », réf desktop) — map
  // LITTÉRALE : les clés t() doivent rester des littéraux (typage next-intl sur fr.json).
  const periodNames: Record<EvolutionPeriod, string> = {
    '7d': t('evolution.periodNames.7d'),
    '30d': t('evolution.periodNames.30d'),
    '90d': t('evolution.periodNames.90d'),
    '1y': t('evolution.periodNames.1y'),
    max: t('evolution.periodNames.max'),
  }
  // InfoTip « évolution » : explique que la courbe trace la quote-part sur la période choisie
  // (retour owner Johanna, juin 2026). Accolé au titre du graphe (mobile + desktop).
  const evolutionInfoTip = (
    <InfoTip content={t('evolution.info')} aria-label={t('evolution.infoAria')} />
  )
  const chartShared = {
    points: chart.points,
    period,
    onPeriodChange,
    periods: periodItems,
    summaryValue: chart.summaryValue,
    summarySub: chart.summarySub,
    summarySuffix: isMax ? t('evolution.sinceJoin') : undefined,
    title: t('evolution.title'),
    axisStart: chart.firstDate ? axisLabel(chart.firstDate, isMax, locale) : '—',
    axisEnd: chart.lastDate ? axisLabel(chart.lastDate, isMax, locale) : '—',
    direction: chart.direction,
    demoLabel: chart.demoLabel,
    periodGroupLabel: t('evolution.periodGroup'),
    info: evolutionInfoTip,
  }

  // Variation « depuis hier » du hero. LIVE : variations.d1 (fraction → formatPct direct),
  // direction selon le signe (négatif → 'down' = data-negative ; nul → 'flat') ; d1 null →
  // PAS de TrendBadge ni de méta (variation optionnelle sur le hero — jamais de NaN).
  // DEMO : inchangé (toujours haussière par construction, percent en % → ÷ 100).
  let heroVariation: TrendBadgeProps | undefined
  if (chartData) {
    const d1 = chartData.variations.d1
    if (d1) {
      heroVariation = {
        direction: d1.amount > 0 ? 'up' : d1.amount < 0 ? 'down' : 'flat',
        value: formatPct(d1.percent),
        subValue: signedEurNoCents(d1.amount),
      }
    }
  } else if (variation1d) {
    heroVariation = {
      direction: 'up',
      value: formatPct(variation1d.percent / 100),
      subValue: signedEurNoCents(variation1d.amount),
    }
  }
  // Label hero DESKTOP avec date (réf : « TA QUOTE-PART · AU 11 JUIN 2026 ») — date longue
  // localisée dérivée de anchorISO ; fallback sur le label simple si la date est invalide
  // (jamais de NaN à l'écran). L'instance mobile garde le label court sans date.
  const anchorDate = new Date(anchorISO)
  const heroLabelDesktop = Number.isNaN(anchorDate.getTime())
    ? t('hero.label')
    : t('v2.heroLabelWithDate', {
        date: new Intl.DateTimeFormat(locale, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(anchorDate),
      })

  const yesterday = new Date(new Date(anchorISO).getTime() - DAY_MS)
  const variationMeta = t('v2.heroMetaYesterday', {
    date: Number.isNaN(yesterday.getTime())
      ? '—'
      : new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
          .format(yesterday)
          .replace(/\//g, '.'),
  })
  // Méta « hier · {date} » rendue UNIQUEMENT avec un TrendBadge (d1 live null → ni l'un ni l'autre).
  const heroVariationMeta = heroVariation ? variationMeta : undefined
  // InfoTip « variation quote-part » : la variation « depuis hier » n'est pas auto-explicative
  // (retour owner Johanna, juin 2026). Câblé sur le hero DESKTOP uniquement (le composant
  // l'ignore sur le hero mobile, qui est un <button> → pas d'interactif imbriqué).
  const quotePartInfoTip = heroVariation ? (
    <InfoTip content={t('quotePart.info')} aria-label={t('quotePart.infoAria')} />
  ) : undefined

  // Ruban mobile — 3 colonnes constantes : capacité absente → « — » (jamais de trou).
  // Label COURT « Capacité » (v2.capacityShort) : le libellé complet déborde en ellipsis
  // sur 375px (réf mobile = « CAPACITÉ ») ; la card desktop garde le label complet.
  // InfoTip « capacité » : la valeur (plafond annuel − versements payés de l'année) n'est
  // pas auto-explicative — explication au tap/hover/focus (retour owner, juin 2026).
  const capacityInfoTip = (
    <InfoTip content={t('capacity.info')} aria-label={t('capacity.infoAria')} />
  )
  const ribbonItems = [
    { label: t('kpi.detention'), value: formatPct(data.detentionPct, { showSign: false }) },
    { label: t('kpi.totalContributed'), value: eurNoCents(data.totalContributed) },
    {
      label: t('v2.capacityShort'),
      value: data.investment.remaining != null ? eurNoCents(data.investment.remaining) : '—',
      info: capacityInfoTip,
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
            variationMeta={heroVariationMeta}
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
            variationMeta={heroVariationMeta}
            variationInfo={quotePartInfoTip}
            label={heroLabelDesktop}
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
          {/* Graphe : compact (mobile, 30J|MAX visibles) / large (desktop, 5 périodes).
              Titre desktop dynamique « Évolution · 30 jours » (réf) ; le compact mobile
              garde « Évolution » seul. */}
          <DashboardEvolutionChart {...chartShared} className="lg:hidden" size="compact" />
          <DashboardEvolutionChart
            {...chartShared}
            className="hidden lg:block"
            size="large"
            title={t('evolution.titleWithPeriod', { periodName: periodNames[period] })}
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
                <dt className="flex items-center gap-1.5 text-[13px] text-text-sec">
                  {t('capacity.title')}
                  {capacityInfoTip}
                </dt>
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
        variationInfo={heroVariation ? t('quotePart.info') : undefined}
      />
    </div>
  )
}
