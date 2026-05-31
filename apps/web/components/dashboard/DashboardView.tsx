'use client'

// Vue dashboard membre (DSH-007b) — états empty / error / stale + pull-to-refresh.
//
// Hydrate depuis `initialData` (RSC), puis TanStack Query gère le refetch.
// États reassurants : empty = "le trésorier doit synchroniser", error = humain + retry,
// stale (>2h) = badge discret (jamais de bandeau rouge agressif).
// Réf : DSH-007b, CLAUDE.md (jamais de NaN/undefined, a11y, copy FR).

import { useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { DashboardHero, KPICard, EmptyState, Spinner } from '@evolve/ui'
import { formatRelativeTime } from '@evolve/utils'

import { contributionStatusLabel, type DashboardData } from '@/lib/data/dashboard'
import { useDashboard } from '@/lib/hooks/useDashboard'

const STALE_MS = 2 * 60 * 60 * 1000 // 2h

export function DashboardView({ initialData }: { initialData: DashboardData | null }) {
  const { data, isError } = useDashboard(initialData)
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)

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
        title="On n’a pas pu charger tes données. Réessaie ?"
        description="Tes données restent en sécurité."
        action={{ label: 'Réessayer', onClick: () => void refresh() }}
      />
    )
  }
  if (!data) {
    return (
      <EmptyState
        icon="Calendar"
        title="Données non disponibles"
        description="Tes données ne sont pas encore disponibles. Le trésorier doit d’abord synchroniser la matrice."
      />
    )
  }

  const stale = data.syncedAt ? Date.now() - new Date(data.syncedAt).getTime() > STALE_MS : false

  return (
    <div className="flex flex-col gap-4" onTouchStart={onTouchStart} onTouchMove={onTouchMove}>
      {refreshing && (
        <div className="flex items-center justify-center gap-2 text-[13px] text-text-sec py-1">
          <Spinner size={16} /> Actualisation…
        </div>
      )}
      {stale && data.syncedAt && (
        <p className="text-[12px] text-text-ter">
          Données mises à jour {formatRelativeTime(data.syncedAt)}.
        </p>
      )}
      <DashboardHero netMarketValue={data.netMarketValue} syncedAt={data.syncedAt} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="Ma détention" value={data.detentionPct} format="pct" icon="ChartPie" />
        <KPICard
          title="Total cotisé"
          value={data.totalContributed}
          format="eur"
          icon="TrendingUp"
        />
        <KPICard
          title="Statut cotisation"
          value={contributionStatusLabel(data.contribution.status)}
          format="raw"
          icon="Calendar"
        />
      </div>
    </div>
  )
}
