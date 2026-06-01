'use client'

// Vue portefeuille (PFT-004/005/006). Hydrate depuis initialData (RSC) ; fusionne les prix live
// (useLivePrices) avec les snapshots via buildPortfolio (live sinon fallback DB). Filtre/tri par
// secteur via nuqs (URL partageable). États empty/error explicites. Pull-to-refresh comme le dashboard.
// Réf : E-PFT, CLAUDE.md (jamais de NaN/undefined, a11y, copy FR, valo live frontend).

import { useMemo, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { useQueryState, parseAsStringEnum, parseAsString } from 'nuqs'

import {
  AllocationDonut,
  PortfolioTable,
  DataRow,
  FilterBar,
  PositionDetailModal,
  SyncBanner,
  EmptyState,
  Spinner,
  Heading,
} from '@evolve/ui'
import { OTHER_SECTOR_LABEL } from '@evolve/types'
import type { PortfolioPosition, PortfolioSort, PortfolioDir } from '@evolve/types'

import { buildPortfolio, filterAndSort, type PortfolioData } from '@/lib/data/portfolio'
import { usePortfolio } from '@/lib/hooks/usePortfolio'
import { useLivePrices } from '@/lib/hooks/useLivePrices'
import { useSyncStatus } from '@/lib/hooks/useSyncStatus'

const SORTS: PortfolioSort[] = ['value', 'name', 'performance']
const DIRS: PortfolioDir[] = ['asc', 'desc']

export function PortfolioView({ initialData }: { initialData: PortfolioData | null }) {
  // Tous les hooks AVANT tout early return (règle des hooks React).
  const { data, isError } = usePortfolio(initialData)
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<PortfolioPosition | null>(null)
  const startY = useRef<number | null>(null)

  // État de filtre/tri persistant dans l'URL (partageable). parseAsString → string | null.
  const [sector, setSector] = useQueryState('sector', parseAsString)
  const [sort, setSort] = useQueryState('sort', parseAsStringEnum(SORTS).withDefault('value'))
  const [dir, setDir] = useQueryState('dir', parseAsStringEnum(DIRS).withDefault('desc'))

  const rows = useMemo(() => data?.positions ?? [], [data?.positions])
  const symbols = useMemo(() => rows.map((r) => r.symbol), [rows])
  const { data: prices } = useLivePrices(symbols)

  const built = useMemo(() => buildPortfolio(rows, prices ?? {}), [rows, prices])
  const sectors = useMemo(
    () => [
      ...new Set(
        built.positions.map((p) =>
          p.sector && p.sector.trim() !== '' ? p.sector : OTHER_SECTOR_LABEL
        )
      ),
    ],
    [built.positions]
  )
  const visible = useMemo(
    () => filterAndSort(built.positions, sector, sort, dir),
    [built.positions, sector, sort, dir]
  )

  const sync = useSyncStatus(data?.clubId ?? null)

  async function refresh() {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    await queryClient.invalidateQueries({ queryKey: ['market-prices'] })
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
        title="On n’a pas pu charger ton portefeuille. Réessaie ?"
        description="Tes données restent en sécurité."
        action={{ label: 'Réessayer', onClick: () => void refresh() }}
      />
    )
  }
  if (!data) {
    return (
      <EmptyState
        icon="ChartPie"
        title="Ton club n’a pas encore de position ouverte."
        description="Le trésorier doit d’abord synchroniser la matrice."
      />
    )
  }

  // Pas de système de toast dans apps/web → erreur de sync surfacée en inline dans le bandeau.
  const syncError = sync.isError
    ? sync.error.message === 'rate_limited'
      ? 'Rate limit atteint. Réessaie dans quelques minutes.'
      : 'La synchronisation a échoué. Réessaie ?'
    : null

  return (
    <div className="flex flex-col gap-6" onTouchStart={onTouchStart} onTouchMove={onTouchMove}>
      {refreshing && (
        <div className="flex items-center justify-center gap-2 text-[13px] text-text-sec">
          <Spinner size={16} /> Actualisation…
        </div>
      )}

      <Heading level="h1" className="text-[20px]">
        Portefeuille
      </Heading>

      <SyncBanner
        syncedAt={data.syncedAt}
        userRole={data.userRole}
        isSyncing={sync.isPending}
        onSync={() => sync.mutate()}
        errorMessage={syncError}
      />

      <AllocationDonut data={built.allocation} totalValue={built.totalValue} />

      <FilterBar
        sectors={sectors}
        sector={sector}
        sort={sort}
        dir={dir}
        onSectorChange={(s) => void setSector(s)}
        onSortChange={(s) => void setSort(s)}
        onDirChange={(d) => void setDir(d)}
      />

      {/* Desktop : table (le composant ne se masque PAS lui-même → wrapper hidden md:block). */}
      <div className="hidden md:block">
        <PortfolioTable positions={visible} onRowClick={setSelected} />
      </div>
      {/* Mobile : cards */}
      <div className="md:hidden flex flex-col gap-3">
        {visible.map((p) => (
          <DataRow key={p.id} position={p} onClick={() => setSelected(p)} />
        ))}
      </div>

      <PositionDetailModal
        position={selected}
        open={selected !== null}
        onOpenChange={(o) => {
          if (!o) setSelected(null)
        }}
      />
    </div>
  )
}
