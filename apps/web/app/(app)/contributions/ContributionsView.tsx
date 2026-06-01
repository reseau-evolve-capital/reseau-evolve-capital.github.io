'use client'

// Vue cotisations (COT-005). Hydrate depuis initialData (RSC) puis laisse TanStack Query gérer
// le refetch (focus fenêtre + pull-to-refresh manuel). États empty/error explicites.
// Le bandeau de retard utilise EXCLUSIVEMENT les tokens data-warning (jamais le rouge brand).
// Réf : E-COT, écran 04_contributions.md, CLAUDE.md (jamais de NaN/undefined, a11y, copy FR, tokens).

import { useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'

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

const STATUS_PILL: Record<ContributionStatus, { status: PillStatus; label: string }> = {
  ok: { status: 'cotisation-ok', label: 'Situation régulière' },
  pending: { status: 'cotisation-pending', label: 'En attente' },
  late: { status: 'cotisation-late', label: 'En retard' },
  exempt: { status: 'cotisation-exempt', label: 'Exempté' },
}

export function ContributionsView({ initialData }: { initialData: ContributionsData | null }) {
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
        title="On n’a pas pu charger tes cotisations. Réessaie ?"
        description="Tes données restent en sécurité."
        action={{ label: 'Réessayer', onClick: () => void refresh() }}
      />
    )
  }
  if (!data) {
    return (
      <EmptyState
        icon="Calendar"
        title="Aucune cotisation pour l’instant"
        description="Ta première cotisation apparaîtra ici."
      />
    )
  }

  // Pas de système de toast dans apps/web → erreur de sync surfacée en inline dans le bandeau.
  const syncError = sync.isError
    ? sync.error.message === 'rate_limited'
      ? 'Rate limit atteint. Réessaie dans quelques minutes.'
      : 'La synchronisation a échoué. Réessaie ?'
    : null

  const pill = STATUS_PILL[data.status]

  return (
    <div className="flex flex-col gap-6" onTouchStart={onTouchStart} onTouchMove={onTouchMove}>
      {refreshing && (
        <div className="flex items-center justify-center gap-2 text-[13px] text-text-sec">
          <Spinner size={16} /> Actualisation…
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level="h1" className="text-[20px]">
          Mes cotisations
        </Heading>
        <div role="status" aria-live="polite">
          <Pill status={pill.status}>{pill.label}</Pill>
        </div>
      </div>

      {/* SyncBanner : masqué pour les membres (rôle « member ») ; visible ≥ trésorier. */}
      <SyncBanner
        syncedAt={data.syncedAt}
        userRole={data.userRole}
        isSyncing={sync.isPending}
        onSync={() => sync.mutate()}
        errorMessage={syncError}
      />

      {data.status === 'late' && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[10px] border border-data-warning-50 bg-data-warning-50 p-4"
        >
          <Icon name="TriangleAlert" size={20} className="text-data-warning" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <Text className="font-semibold">
              Tu as un retard de cotisation de {formatEUR(data.amountDue)}.
            </Text>
            <Text variant="caption" color="text-sec" className="normal-case tracking-normal">
              Rapproche-toi du trésorier de ton club pour régulariser ta situation.
            </Text>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard title="Total cotisé" value={data.totalContributed} format="eur" />
        <KPICard title="Nombre de mois" value={data.monthsCount} format="raw" />
        <KPICard title="Quote-part" value={data.detentionPct} format="pct" />
      </div>

      <div className="rounded-[10px] border border-border bg-card p-4">
        <Text className="font-semibold">Pénalités</Text>
        <Text color="text-sec" className="mt-1 block">
          {data.penalties > 0
            ? `${formatEUR(data.penalties)} de pénalités en cours.`
            : 'Aucune pénalité en cours.'}
        </Text>
      </div>

      <div className="flex flex-col gap-3">
        <Heading level="h2" className="text-[18px]">
          Historique mensuel
        </Heading>
        <ContributionsTimeline years={data.years} />
      </div>

      {/* Génération PDF de l'attestation reportée à la V1 (décision E-COT). */}
      <Button variant="secondary" disabled className="self-start">
        Télécharger l’attestation de détention (bientôt)
      </Button>
    </div>
  )
}
