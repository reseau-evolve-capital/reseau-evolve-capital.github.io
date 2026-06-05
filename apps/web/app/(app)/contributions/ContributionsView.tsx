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
  useToast,
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
  const toast = useToast()
  // Tous les hooks AVANT tout early return (règle des hooks React).
  const { data, isError } = useContributions(initialData)
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [attestationError, setAttestationError] = useState<string | null>(null)
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

  // Télécharge le PDF d'attestation : fetch → blob → ancre temporaire (filename depuis l'en-tête).
  // Succès/erreur surfacés via toast (ToastProvider monté au layout) + message inline persistant.
  async function downloadAttestation() {
    if (downloading) return
    setAttestationError(null)
    setDownloading(true)
    try {
      const clubId = data?.clubId
      const qs = clubId ? `?clubId=${encodeURIComponent(clubId)}` : ''
      const res = await fetch(`/api/attestation/detention${qs}`, {
        headers: { Accept: 'application/pdf' },
      })
      if (!res.ok) throw new Error('attestation_failed')
      const blob = await res.blob()
      // Filename depuis Content-Disposition, fallback déterministe.
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = /filename="?([^"]+)"?/.exec(disposition)
      const filename = match?.[1] ?? 'attestation-detention.pdf'
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
      // Confirmation éphémère (le téléchargement n'est pas toujours visible selon le navigateur).
      toast.success({ title: t('attestation.success') })
    } catch {
      // Toast d'erreur + message inline persistant (role=alert) pour l'accessibilité.
      setAttestationError(t('attestation.error'))
      toast.error({ title: t('attestation.error') })
    } finally {
      setDownloading(false)
    }
  }

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

  // Rate-limit (429) surfacé INLINE dans le bandeau ; les autres feedbacks (succès/warning/échec)
  // passent par le toast centralisé du hook useSyncStatus.
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

          {/* CTA actif — télécharge l'attestation de détention en PDF (NTF-004).
              Feedback via toast (ToastProvider monté au layout) + erreur inline persistante. */}
          <div className="flex flex-col gap-2 lg:self-stretch">
            <Button
              variant="secondary"
              onClick={() => void downloadAttestation()}
              disabled={downloading}
              className="min-h-[44px] self-start lg:self-stretch"
            >
              {downloading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size={16} /> {t('attestation.loading')}
                </span>
              ) : (
                t('attestation.cta')
              )}
            </Button>
            {attestationError && (
              <div role="alert">
                <Text variant="caption" className="text-data-warning-strong">
                  {attestationError}
                </Text>
              </div>
            )}
          </div>
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
