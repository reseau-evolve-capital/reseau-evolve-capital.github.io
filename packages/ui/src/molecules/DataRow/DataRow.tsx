import * as React from 'react'
import { formatEUR, formatPct } from '@evolve/utils'
import type { PortfolioPosition } from '@evolve/types'
import { Badge } from '../../atoms/Badge'
import { Skeleton } from '../../atoms/Skeleton'
import { cn } from '../../lib/cn'

export interface DataRowProps {
  position: PortfolioPosition
  onClick?: () => void
  isLoading?: boolean
  className?: string
  /** Slot info accolé à la valeur de perf (ex. un `<InfoTip>` injecté par l'app, explique le
   *  gain/perte depuis l'achat). Présentationnel, pas de défaut FR. Rendu HORS du bouton
   *  cliquable de la carte (un interactif imbriqué dans un <button> est invalide en a11y) :
   *  superposé en haut à droite, aligné sur la valeur de perf. */
  perfInfo?: React.ReactNode
}

/** Carte d'une position (vue mobile). Cliquable si `onClick`. data-negative pour les pertes. */
export function DataRow({ position, onClick, isLoading, className, perfInfo }: DataRowProps) {
  if (isLoading) {
    return (
      <div className={cn('p-4 rounded-[10px] bg-card border border-border', className)}>
        <Skeleton height="16px" width="50%" />
        <div className="mt-3">
          <Skeleton height="14px" width="75%" />
        </div>
      </div>
    )
  }

  const loss = position.gainLossPct < 0
  // Cours affiché : live si dispo, sinon repli matrice (snapshot ancien), sinon "—" (QA 2026-06-07).
  const unitPrice = position.livePrice ?? position.marketPrice
  const cours = unitPrice == null ? '—' : formatEUR(unitPrice)
  const label = `Position ${position.name}, ${position.quantity} parts, valeur ${formatEUR(
    position.currentValue
  )}, performance ${formatPct(position.gainLossPct)}`

  const inner = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="font-display font-bold text-[14px] text-text truncate">
          {position.name}
        </span>
        {position.category && <Badge>{position.category}</Badge>}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[13px] text-text-sec [font-feature-settings:'tnum']">
          {position.quantity} parts × {cours} = {formatEUR(position.currentValue)}
        </p>
        <span
          className={cn(
            "font-semibold text-[13px] [font-feature-settings:'tnum']",
            loss ? 'text-data-negative' : 'text-data-positive'
          )}
        >
          {formatPct(position.gainLossPct)}
        </span>
      </div>
    </>
  )

  const base = 'block w-full text-left p-4 rounded-[10px] bg-card border border-border'
  if (onClick) {
    // perfInfo rendu en frère du <button> (jamais à l'intérieur) : superposé en haut à droite,
    // au niveau de la valeur de perf. Le wrapper relatif ne capte pas le clic de la carte ;
    // l'InfoTip a son propre stacking via z-10. Pas de perfInfo → rendu identique à avant.
    return (
      <div className={cn('relative', className)}>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          data-testid="position-row"
          className={cn(
            base,
            'transition-shadow hover:shadow-[var(--sh-card)] focus-visible:shadow-[var(--sh-glow)] outline-none'
          )}
        >
          {inner}
        </button>
        {perfInfo ? (
          <span className="absolute right-3 top-11 z-10 inline-flex">{perfInfo}</span>
        ) : null}
      </div>
    )
  }
  return (
    <div className={cn('relative', className)} data-testid="position-row">
      <div className={base}>{inner}</div>
      {perfInfo ? (
        <span className="absolute right-3 top-11 z-10 inline-flex">{perfInfo}</span>
      ) : null}
    </div>
  )
}
