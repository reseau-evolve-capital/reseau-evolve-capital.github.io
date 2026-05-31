import * as React from 'react'
import type { PortfolioSort, PortfolioDir } from '@evolve/types'
import { cn } from '../../lib/cn'

export interface FilterBarProps {
  sectors: string[]
  /** Secteur actif ; null = "Tous". */
  sector?: string | null
  sort: PortfolioSort
  dir: PortfolioDir
  onSectorChange: (sector: string | null) => void
  onSortChange: (sort: PortfolioSort) => void
  onDirChange: (dir: PortfolioDir) => void
  className?: string
}

const SORT_LABEL: Record<PortfolioSort, string> = {
  value: 'Valeur',
  name: 'Nom',
  performance: 'Performance',
}

function SectorPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-[9999px] px-3 py-1.5 text-[13px] font-medium border transition-colors',
        'focus-visible:outline-none focus-visible:shadow-[var(--shadow-glow)]',
        active
          ? 'bg-brand-yellow text-accent-ink border-transparent'
          : 'bg-card text-text-sec border-border hover:bg-card-sub'
      )}
    >
      {children}
    </button>
  )
}

/** Barre filtres (secteur) + tri + sens. Présentationnel — l'état vit chez l'appelant. */
export function FilterBar({
  sectors,
  sector,
  sort,
  dir,
  onSectorChange,
  onSortChange,
  onDirChange,
  className,
}: FilterBarProps) {
  const current = sector ?? null
  return (
    <div
      role="group"
      aria-label="Filtres du portefeuille"
      className={cn('flex flex-wrap items-center gap-3 bg-card-sub p-3 rounded-[10px]', className)}
    >
      <div className="flex flex-wrap gap-2">
        <SectorPill active={current === null} onClick={() => onSectorChange(null)}>
          Tous
        </SectorPill>
        {sectors.map((s) => (
          <SectorPill key={s} active={current === s} onClick={() => onSectorChange(s)}>
            {s}
          </SectorPill>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <label className="sr-only" htmlFor="pf-sort">
          Trier par
        </label>
        <select
          id="pf-sort"
          data-testid="sort-select"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as PortfolioSort)}
          className="text-[13px] rounded-[8px] border border-border bg-card px-2 py-1.5 text-text focus-visible:outline-none focus-visible:shadow-[var(--shadow-glow)]"
        >
          {(Object.keys(SORT_LABEL) as PortfolioSort[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABEL[k]}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label={dir === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}
          onClick={() => onDirChange(dir === 'asc' ? 'desc' : 'asc')}
          className="text-[13px] rounded-[8px] border border-border bg-card px-2.5 py-1.5 text-text focus-visible:outline-none focus-visible:shadow-[var(--shadow-glow)]"
        >
          <span aria-hidden="true">{dir === 'asc' ? '↑' : '↓'}</span>
        </button>
      </div>
    </div>
  )
}
