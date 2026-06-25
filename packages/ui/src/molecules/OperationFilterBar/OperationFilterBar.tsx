import * as React from 'react'
import { Icon } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

export interface FilterChipProps {
  /** Libellé du filtre (ex. « Type », « Membre », « Période »). */
  label: string
  /** Valeur courante affichée (ex. « Tous », « 6 derniers mois »). */
  value: string
  onClick?: () => void
  className?: string
}

/**
 * FilterChip (`.cot-filter`) — pastille pill « {label} {value} ▾ ».
 * Spec : `docs/tickets/design-refs/E-OPS-2-design-spec.md` §5 (FilterChip).
 */
export function FilterChip({ label, value, onClick, className }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-border-strong bg-card px-3.5',
        'text-text transition-colors duration-150 hover:border-text-ter',
        'focus-visible:outline-none focus-visible:shadow-glow',
        className
      )}
    >
      <span className="text-[12.5px] font-medium text-text-ter">{label}</span>
      <span className="text-[13px] font-semibold">{value}</span>
      <Icon name="ChevronDown" size={16} aria-hidden="true" className="text-text-ter" />
    </button>
  )
}

/** Un filtre déclaratif (clé + libellé + valeur courante). */
export interface OperationFilter {
  key: string
  label: string
  value: string
}

export interface OperationFilterBarProps {
  filters: OperationFilter[]
  /** Clic sur un filtre (l'appelant ouvre son propre menu / cycle de valeurs). */
  onFilterClick?: (key: string) => void
  /** Libellé de tri à droite, défaut FR. */
  sortLabel?: string
  className?: string
}

/**
 * OperationFilterBar (molecule) — rangée de FilterChip + libellé de tri.
 * Spec : `docs/tickets/design-refs/E-OPS-2-design-spec.md` §5 (Filtres).
 *
 * Contrôlé : valeurs via `filters`, événements via `onFilterClick`. Aucune logique de menu
 * ici (l'appelant gère l'ouverture des options).
 */
export function OperationFilterBar({
  filters,
  onFilterClick,
  sortLabel = 'Trié par date',
  className,
}: OperationFilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2.5 border-b border-border px-[18px] py-3.5',
        className
      )}
    >
      {filters.map((f) => (
        <FilterChip
          key={f.key}
          label={f.label}
          value={f.value}
          onClick={() => onFilterClick?.(f.key)}
        />
      ))}
      <span className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-text-ter">
        {sortLabel}
        <Icon name="ChevronDown" size={16} aria-hidden="true" />
      </span>
    </div>
  )
}
