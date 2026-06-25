import * as React from 'react'
import { CashDeltaBadge } from '../../atoms/CashDeltaBadge'
import { cn } from '../../lib/cn'

export interface CashImpactPanelProps {
  /** Delta cash signé (€). `null`/`undefined` → affiche un tiret neutre (jamais NaN). */
  value: number | null | undefined
  /** Note explicative (change selon le type d'opération). i18n côté appelant. */
  note?: string
  /** Caption en capitales. Défaut FR. */
  caption?: string
  className?: string
}

/**
 * CashImpactPanel — encart « Impact sur le solde espèces » AVANT validation (E-OPS-2 §4 CashImpact).
 *
 * Caption + note à gauche, `CashDeltaBadge` taille `lg` à droite, fond `--card-sub`.
 * Jamais de NaN : une valeur absente affiche « — » (pas de badge coloré trompeur).
 */
export function CashImpactPanel({
  value,
  note,
  caption = 'Impact sur le solde espèces',
  className,
}: CashImpactPanelProps) {
  const hasValue = typeof value === 'number' && Number.isFinite(value)
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-card-sub px-[18px] py-4',
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-text-ter">
          {caption}
        </p>
        {note && <p className="mt-1.5 text-[13px] text-text-sec">{note}</p>}
      </div>
      {hasValue ? (
        <CashDeltaBadge value={value} size="lg" />
      ) : (
        <span aria-hidden="true" className="font-display text-[16px] font-bold text-text-ter">
          —
        </span>
      )}
    </div>
  )
}
