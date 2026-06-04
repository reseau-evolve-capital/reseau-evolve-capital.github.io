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
  /** Libellés des options de tri. Défauts FR ; fusionnés clé par clé. */
  sortLabels?: Partial<Record<PortfolioSort, string>>
  /** Libellés a11y / pills (groupe, « Tous », tri, ordre). Défauts FR ; fusionnés clé par clé. */
  labels?: Partial<{
    /** aria-label du groupe de filtres. */
    group: string
    /** Pill « tous les secteurs ». */
    all: string
    /** Label a11y du select de tri (sr-only). */
    sortBy: string
    /** aria-label du bouton quand l'ordre est croissant. */
    ascending: string
    /** aria-label du bouton quand l'ordre est décroissant. */
    descending: string
  }>
}

const SORT_LABEL: Record<PortfolioSort, string> = {
  value: 'Valeur',
  name: 'Nom',
  performance: 'Performance',
}

const DEFAULT_LABELS = {
  group: 'Filtres du portefeuille',
  all: 'Tous',
  sortBy: 'Trier par',
  ascending: 'Ordre croissant',
  descending: 'Ordre décroissant',
} as const

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
        'inline-flex items-center justify-center rounded-[9999px] px-3 py-1.5 text-[13px] font-medium border transition-colors min-h-[44px]',
        'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]',
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
  sortLabels,
  labels,
}: FilterBarProps) {
  const sortId = React.useId()
  const sortLabel: Record<PortfolioSort, string> = { ...SORT_LABEL, ...sortLabels }
  const l = { ...DEFAULT_LABELS, ...labels }
  return (
    <div
      role="group"
      aria-label={l.group}
      className={cn('flex flex-wrap items-center gap-3 bg-card-sub p-3 rounded-[10px]', className)}
    >
      <div className="flex flex-wrap gap-2">
        <SectorPill active={sector == null} onClick={() => onSectorChange(null)}>
          {l.all}
        </SectorPill>
        {sectors.map((s) => (
          <SectorPill key={s} active={sector === s} onClick={() => onSectorChange(s)}>
            {s}
          </SectorPill>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <label className="sr-only" htmlFor={sortId}>
          {l.sortBy}
        </label>
        <select
          id={sortId}
          data-testid="sort-select"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as PortfolioSort)}
          className="text-[13px] rounded-[8px] border border-border bg-card px-2 py-1.5 text-text focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]"
        >
          {(Object.keys(SORT_LABEL) as PortfolioSort[]).map((k) => (
            <option key={k} value={k}>
              {sortLabel[k]}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label={dir === 'asc' ? l.ascending : l.descending}
          onClick={() => onDirChange(dir === 'asc' ? 'desc' : 'asc')}
          className="inline-flex items-center justify-center text-[13px] rounded-[8px] border border-border bg-card px-2.5 py-1.5 text-text focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] min-h-[44px] min-w-[44px]"
        >
          <span aria-hidden="true">{dir === 'asc' ? '↑' : '↓'}</span>
        </button>
      </div>
    </div>
  )
}
