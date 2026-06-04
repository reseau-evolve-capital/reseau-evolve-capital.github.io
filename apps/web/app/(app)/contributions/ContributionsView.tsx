'use client'

// Vue cotisations (COT-005). Hydrate depuis initialData (RSC) puis laisse TanStack Query gérer
// le refetch (focus fenêtre + pull-to-refresh manuel). États empty/error explicites.
// Le bandeau de retard utilise EXCLUSIVEMENT les tokens data-warning (jamais le rouge brand).
// Réf : E-COT, écran 04_contributions.md, CLAUDE.md (jamais de NaN/undefined, a11y, copy FR, tokens).

import { useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'

import {
  ContributionsTimeline,
  KPICard,
  Pill,
  type PillStatus,
  EmptyState,
  SyncBanner,
  Heading,
  Text,
  Icon,
  Button,
  Spinner,
} from '@evolve/ui'
import { formatEUR } from '@evolve/utils'

import type { ContributionsData, ContributionStatus } from '@/lib/data/contributions'
import { useContributions } from '@/lib/hooks/useContributions'
import { useSyncStatus } from '@/lib/hooks/useSyncStatus'

// La variante visuelle (couleur) du Pill reste interne ; seul le libellé est externalisé (i18n).
const STATUS_PILL: Record<ContributionStatus, PillStatus> = {
  ok: 'cotisation-ok',
  pending: 'cotisation-pending',
  late: 'cotisation-late',
  exempt: 'cotisation-exempt',
}

export function ContributionsView({ initialData }: { initialData: ContributionsData | null }) {
  const t = useTranslations('contributions')
  const tc = useTranslations('common')
  // Tous les hooks AVANT tout early return (règle des hooks React).
  const { data, isError } = useContributions(initialData)
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const sync = useSyncStatus(data?.clubId ?? null)

  async function refresh() {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['contributions'] })
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
        title={t('error.loadTitle')}
        description={tc('dataSafe')}
        action={{ label: tc('retry'), onClick: () => void refresh() }}
      />
    )
  }
  if (!data) {
    return (
      <EmptyState icon="Calendar" title={t('empty.title')} description={t('empty.description')} />
    )
  }

  // Pas de système de toast dans apps/web → erreur de sync surfacée en inline dans le bandeau.
  const syncError = sync.isError
    ? sync.error.message === 'rate_limited'
      ? t('sync.rateLimited')
      : t('sync.failed')
    : null

  const pillStatus = STATUS_PILL[data.status]

  // SyncBanner ne s'affiche que pour les rôles ≥ trésorier (cf. SyncBanner). On reproduit la
  // garde ici pour ne pas réserver un wrapper vide (et son gap) côté membre sur mobile.
  const showSyncBanner = data.userRole !== 'member'

  return (
    <div className="flex flex-col gap-6" onTouchStart={onTouchStart} onTouchMove={onTouchMove}>
      {refreshing && (
        <div className="flex items-center justify-center gap-2 text-[13px] text-text-sec">
          <Spinner size={16} /> {tc('refreshing')}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level="h1" className="text-[20px]">
          {t('title')}
        </Heading>
        <div role="status" aria-live="polite">
          <Pill status={pillStatus}>{t(`status.${data.status}`)}</Pill>
        </div>
      </div>

      {/* SyncBanner : masqué pour les membres (rôle « member ») ; visible ≥ trésorier.
          Sur desktop (≥ md), la topbar du shell porte déjà le statut sync → on masque le
          bandeau in-content pour éviter le doublon. Conservé sur mobile (pas de topbar sync). */}
      {showSyncBanner && (
        <div className="md:hidden">
          <SyncBanner
            syncedAt={data.syncedAt}
            userRole={data.userRole}
            isSyncing={sync.isPending}
            onSync={() => sync.mutate()}
            errorMessage={syncError}
          />
        </div>
      )}

      {/* Layout : empilé en mobile, 2 colonnes en desktop (stats à gauche, historique à droite). */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-6 lg:items-start">
        {/* COLONNE GAUCHE — situation, KPIs, pénalités, CTA attestation. */}
        <div className="flex flex-col gap-4">
          {data.status === 'late' && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-[10px] border border-data-warning bg-data-warning-50 p-4"
            >
              <Icon
                name="TriangleAlert"
                size={20}
                className="text-data-warning"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-1">
                <Text className="font-semibold">
                  {t('lateAlert.title', { amount: formatEUR(data.amountDue) })}
                </Text>
                <Text variant="caption" color="text-sec" className="normal-case tracking-normal">
                  {t('lateAlert.body')}
                </Text>
              </div>
            </div>
          )}

          {/* KPIs : 3 colonnes en mobile/tablette, empilés en desktop (colonne étroite). */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <KPICard title={t('kpi.totalContributed')} value={data.totalContributed} format="eur" />
            <KPICard title={t('kpi.monthsCount')} value={data.monthsCount} format="raw" />
            <KPICard title={t('kpi.detentionPct')} value={data.detentionPct} format="pct" />
          </div>

          <div className="rounded-[10px] border border-border bg-card p-4">
            <Text className="font-semibold">{t('penalties.title')}</Text>
            <Text color="text-sec" className="mt-1 block">
              {data.penalties > 0
                ? t('penalties.active', { amount: formatEUR(data.penalties) })
                : t('penalties.none')}
            </Text>
          </div>

          {/* Génération PDF de l'attestation reportée à la V1 (décision E-COT). */}
          <Button variant="secondary" disabled className="self-start lg:self-stretch">
            {t('attestationCta')}
          </Button>
        </div>

        {/* COLONNE DROITE — historique mensuel (légende + timeline). */}
        <div className="flex flex-col gap-3">
          <Heading level="h2" className="text-[18px]">
            {t('historyTitle')}
          </Heading>
          <ContributionsTimeline
            years={data.years}
            labels={{
              legend: {
                paid: t('timeline.legend.paid'),
                pending: t('timeline.legend.pending'),
                late: t('timeline.legend.late'),
                exempt: t('timeline.legend.exempt'),
                upcoming: t('timeline.legend.upcoming'),
              },
              monthInitials: t.raw('timeline.monthInitials') as readonly string[],
              legendLabel: t('timeline.legendLabel'),
              historyLabel: t('timeline.historyLabel'),
              emptyTitle: t('timeline.emptyTitle'),
              emptyDescription: t('timeline.emptyDescription'),
            }}
          />
        </div>
      </div>
    </div>
  )
}
