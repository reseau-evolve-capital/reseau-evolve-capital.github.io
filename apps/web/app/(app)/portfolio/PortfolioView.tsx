'use client'

// Vue portefeuille (PFT-004/005/006). Hydrate depuis initialData (RSC) ; fusionne les prix live
// (useLivePrices) avec les snapshots via buildPortfolio (live sinon fallback DB). Filtre/tri par
// secteur via nuqs (URL partageable). États empty/error explicites. Pull-to-refresh comme le dashboard.
//
// Layout : EMPILÉ (< lg, ordre source = en-tête → filtres → table → donut → gain/perte) ; sur desktop
// (≥ lg) la MÊME arborescence DOM bascule en GRILLE 3 COLONNES fidèle à la réf via grid-areas :
// [filtres + dernière sync] · [en-tête + hero valeur totale + table] · [répartition + gain/perte].
// Aucune duplication de noeud (sinon double `position-row`/pill → e2e cassé). Le state nuqs
// (sector/sort/dir) et filterAndSort sont INCHANGÉS — seul le placement CSS change. Le SyncBanner
// in-content est masqué ≥ md (la topbar du shell porte déjà le statut de sync) et conservé < md.
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
  TrendBadge,
  CurrencyAmount,
  EmptyState,
  Spinner,
  Heading,
} from '@evolve/ui'
import { OTHER_SECTOR_LABEL } from '@evolve/types'
import type { PortfolioPosition, PortfolioSort, PortfolioDir } from '@evolve/types'
import { formatEUR, formatPct, formatRelativeTime } from '@evolve/utils'

import { buildPortfolio, filterAndSort, type PortfolioData } from '@/lib/data/portfolio'
import { usePortfolio } from '@/lib/hooks/usePortfolio'
import { useLivePrices } from '@/lib/hooks/useLivePrices'
import { useSyncStatus } from '@/lib/hooks/useSyncStatus'

const SORTS: PortfolioSort[] = ['value', 'name', 'performance']
const DIRS: PortfolioDir[] = ['asc', 'desc']

/** Direction du TrendBadge selon le signe du gain/perte (flat à 0, jamais de NaN). */
function trendDirection(value: number): 'up' | 'down' | 'flat' {
  if (!Number.isFinite(value) || value === 0) return 'flat'
  return value > 0 ? 'up' : 'down'
}

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

  // Gain/perte total du portefeuille (somme des +/- € de toutes les positions, hors filtre).
  const totalGainLoss = useMemo(
    () =>
      built.positions.reduce((s, p) => s + (Number.isFinite(p.gainLossEur) ? p.gainLossEur : 0), 0),
    [built.positions]
  )
  // % global = gain/perte total / coût de revient (currentValue − gainLoss). 0 si dénominateur ≤ 0.
  const totalGainLossPct = useMemo(() => {
    const cost = built.totalValue - totalGainLoss
    return cost > 0 ? totalGainLoss / cost : 0
  }, [built.totalValue, totalGainLoss])

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

  const openCount = built.positions.length
  const subtitle = `${openCount} position${openCount > 1 ? 's' : ''} ouverte${
    openCount > 1 ? 's' : ''
  }`
  const totalDir = trendDirection(totalGainLoss)

  return (
    <div className="flex flex-col gap-6" onTouchStart={onTouchStart} onTouchMove={onTouchMove}>
      {refreshing && (
        <div className="flex items-center justify-center gap-2 text-[13px] text-text-sec">
          <Spinner size={16} /> Actualisation…
        </div>
      )}

      {/* SyncBanner in-content : conservé < md (la topbar mobile ne montre pas le statut de sync),
          masqué ≥ md où la topbar du shell affiche déjà « Synchronisé … » (anti-redondance). */}
      <div className="md:hidden">
        <SyncBanner
          syncedAt={data.syncedAt}
          userRole={data.userRole}
          isSyncing={sync.isPending}
          onSync={() => sync.mutate()}
          errorMessage={syncError}
        />
      </div>

      {/*
        UNE seule arborescence DOM. < lg : empilée (flex column dans l'ordre source).
        ≥ lg : grille 3 colonnes [240px · 1fr · 300px] où chaque enfant est repositionné
        via lg:col-start / lg:row-start (aucune duplication de noeud → e2e préservé).
      */}
      <div
        className={
          'flex flex-col gap-6 ' +
          'lg:grid lg:grid-cols-[240px_minmax(0,1fr)_300px] lg:grid-rows-[auto_auto] lg:items-start lg:gap-x-6 lg:gap-y-5'
        }
      >
        {/* En-tête centre : titre + sous-titre + hero valeur totale + gain/perte (TrendBadge). */}
        <header className="flex flex-col gap-2 lg:col-start-2 lg:row-start-1">
          <Heading level="h1" className="text-[20px]">
            Portefeuille
          </Heading>
          <p className="text-[13px] text-text-sec">{subtitle}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <CurrencyAmount amount={built.totalValue} size="xl" className="block" />
            <TrendBadge
              direction={totalDir}
              value={formatEUR(totalGainLoss)}
              subValue={formatPct(totalGainLossPct)}
            />
          </div>
        </header>

        {/* Colonne gauche : filtres secteur/tri (FilterBar, state nuqs inchangé) + dernière sync. */}
        <aside
          aria-label="Filtres"
          className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1 lg:row-span-2"
        >
          <FilterBar
            sectors={sectors}
            sector={sector}
            sort={sort}
            dir={dir}
            onSectorChange={(s) => void setSector(s)}
            onSortChange={(s) => void setSort(s)}
            onDirChange={(d) => void setDir(d)}
          />
          <div className="flex flex-col gap-1 rounded-[10px] border border-border bg-card-sub px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-ter">
              Dernière sync
            </span>
            <span className="text-[13px] text-text-sec [font-feature-settings:'tnum']">
              {data.syncedAt ? formatRelativeTime(data.syncedAt) : '—'}
            </span>
          </div>
        </aside>

        {/* Colonne droite : répartition sectorielle (donut + légende) + gain/perte total. */}
        <aside
          aria-label="Synthèse"
          className="flex flex-col gap-4 lg:col-start-3 lg:row-start-1 lg:row-span-2"
        >
          <section aria-labelledby="alloc-title" className="flex flex-col gap-3">
            <h3
              id="alloc-title"
              className="font-display text-[13px] font-semibold uppercase tracking-[0.06em] text-text-ter"
            >
              Répartition sectorielle
            </h3>
            <AllocationDonut data={built.allocation} totalValue={built.totalValue} />
          </section>
          <div className="flex flex-col gap-2 rounded-[10px] border border-border bg-card-sub px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-ter">
              Gain / perte total
            </span>
            <CurrencyAmount amount={totalGainLoss} size="lg" showSign className="block" />
            <TrendBadge
              direction={totalDir}
              value={formatPct(totalGainLossPct)}
              className="self-start"
            />
          </div>
        </aside>

        {/* Table (porte les data-testid="position-row" desktop) + cards mobile.
            totalCount = total avant filtre → footer « Affiche N sur M » sous filtre. */}
        <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-start-2">
          {/* Desktop : table (le composant ne se masque PAS lui-même → wrapper hidden md:block). */}
          <div className="hidden md:block">
            <PortfolioTable
              positions={visible}
              onRowClick={setSelected}
              totalCount={built.positions.length}
            />
          </div>
          {/* Mobile : cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {visible.map((p) => (
              <DataRow key={p.id} position={p} onClick={() => setSelected(p)} />
            ))}
          </div>
        </div>
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
