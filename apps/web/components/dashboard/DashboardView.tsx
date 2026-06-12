'use client'

// Vue dashboard membre (DSH-007b) — états empty / error / stale + pull-to-refresh.
//
// Hydrate depuis `initialData` (RSC), puis TanStack Query gère le refetch.
// États reassurants : empty = "le trésorier doit synchroniser", error = humain + retry,
// stale (>2h) = badge discret (jamais de bandeau rouge agressif).
// Réf : DSH-007b, CLAUDE.md (jamais de NaN/undefined, a11y, copy FR).

import { useEffect, useRef, useState } from 'react'

import { useTranslations, useLocale } from 'next-intl'

import { useQueryClient } from '@tanstack/react-query'

import {
  DashboardHero,
  KPICard,
  ContributionStatusCard,
  CurrencyAmount,
  Icon,
  InfoTip,
  EmptyState,
  Spinner,
  SyncBanner,
  useToast,
} from '@evolve/ui'
import { formatRelativeTime, formatEUR } from '@evolve/utils'

import { analyticsEvents, valueBucket } from '@/lib/analytics'
import { type DashboardData } from '@/lib/data/dashboard'
import { useDashboard } from '@/lib/hooks/useDashboard'
import { useSyncStatus } from '@/lib/hooks/useSyncStatus'

import { HeroDetailDialog } from './HeroDetailDialog'

const STALE_MS = 2 * 60 * 60 * 1000 // 2h

export function DashboardView({ initialData }: { initialData: DashboardData | null }) {
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
  const startY = useRef<number | null>(null)
  // Feedback de sync centralisé dans le hook (toast succès/warning/erreur). Le rate-limit (429)
  // reste affiché inline dans le SyncBanner via sync.isError (pas de toast).
  const sync = useSyncStatus(data?.clubId ?? null, {
    toast,
    labels: {
      successTitle: t('sync.success'),
      warningTitle: t('sync.warning'),
      warningMessage: t('sync.warningMessage'),
      errorTitle: t('sync.failed'),
    },
  })
  // `Date.now()` est impur en render (react-hooks/purity) : on capture "maintenant" dans un effet.
  // Le setState passe par un rAF pour éviter un setState synchrone dans le corps de l'effet
  // (react-hooks/set-state-in-effect) — il s'exécute après le commit, hors render.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(Date.now()))
    return () => cancelAnimationFrame(raf)
  }, [data?.syncedAt])
  // Analytics (A/B dashboard V2) : dashboard_viewed — une fois par montage, dès que les
  // données sont prêtes. Valeurs BUCKETISÉES (jamais de montant exact vers GA), pas de setState.
  const viewedRef = useRef(false)
  useEffect(() => {
    if (viewedRef.current || !data) return
    viewedRef.current = true
    analyticsEvents.dashboard.viewed({
      variant: 'v1',
      valueBucket: valueBucket(data.netMarketValue),
      contributionStatus: data.contribution.status,
    })
  }, [data])

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

  // Rate-limit (429) surfacé INLINE dans le bandeau ; les autres feedbacks (succès/warning/échec)
  // passent par le toast centralisé du hook useSyncStatus.
  const syncError = sync.isError
    ? sync.error.message === 'rate_limited'
      ? t('sync.rateLimited')
      : t('sync.failed')
    : null

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
      {/* E1 : le bloc quote-part est mis en avant (bordure accent), comme « valeur nette
          détenue » des cotisations — info clé au 1er coup d'œil sur mobile. */}
      <DashboardHero
        netMarketValue={data.netMarketValue}
        syncedAt={data.syncedAt}
        onClick={() => {
          analyticsEvents.dashboard.heroDetailOpened({ variant: 'v1' })
          setDetailOpen(true)
        }}
        highlight
        label={t('hero.label')}
        detailLabel={t('hero.viewDetail')}
        accessibleNameTemplate={(amount) => t('hero.aria', { amount })}
        syncedAtTemplate={(time) => t('hero.updated', { time })}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title={t('kpi.detention')}
          value={data.detentionPct}
          format="pct"
          icon="ChartPie"
        />
        <KPICard
          title={t('kpi.totalContributed')}
          value={data.totalContributed}
          format="eur"
          icon="TrendingUp"
        />
        {/* E4 : statut cotisation explicite (icône + état + message + montant dû) au lieu
            du « En attente » brut peu parlant. En retard → carte mise en avant (orange). */}
        <ContributionStatusCard
          status={data.contribution.status}
          title={t('kpi.contributionStatus')}
          statusLabel={t(`statusValue.${data.contribution.status}`)}
          message={t(`contributionMessage.${data.contribution.status}`)}
          amountDueLabel={
            data.contribution.amountDue > 0 ? formatEUR(data.contribution.amountDue) : null
          }
        />
      </div>

      {/* E3 : capacité d'investissement restante de l'année (réutilise le calcul de
          l'attestation) — pousse à investir le maximum. Affiché si le plafond est défini.
          Mise en avant subtile (bordure accent). */}
      {data.investment.remaining != null && (
        <div className="flex flex-col gap-1 rounded-[14px] border border-accent bg-card p-5 shadow-[var(--sh-card)]">
          <div className="flex items-center justify-between gap-2">
            {/* InfoTip : explication de la capacité (plafond annuel − versements payés de
                l'année) au tap/hover/focus — même copy que la V2 (retour owner, juin 2026). */}
            <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-text-ter">
              {t('capacity.title')}
              <InfoTip content={t('capacity.info')} aria-label={t('capacity.infoAria')} />
            </p>
            <Icon name="TrendingUp" size={20} aria-hidden="true" className="text-accent" />
          </div>
          <CurrencyAmount amount={data.investment.remaining} size="lg" />
          <p className="text-[13px] leading-snug text-text-sec">
            {t('capacity.subtitle', { amount: formatEUR(data.investment.remaining) })}
          </p>
        </div>
      )}
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
