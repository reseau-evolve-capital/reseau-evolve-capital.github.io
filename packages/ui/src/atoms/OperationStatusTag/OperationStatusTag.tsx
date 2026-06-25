import * as React from 'react'
import { cn } from '../../lib/cn'

export type OperationStatusVariant = 'settled' | 'cancelled'

export interface OperationStatusTagProps {
  variant: OperationStatusVariant
  /** Copy FR par défaut, surchargeable (i18n côté apps/web). */
  settledLabel?: string
  cancelledLabel?: string
  className?: string
}

/**
 * OperationStatusTag — statut d'une opération (settlée / annulée).
 * Spec : `docs/tickets/design-refs/E-OPS-2-design-spec.md` §5 (StatusTag).
 *
 * Settlée : fond jaune de marque + texte `--data-dividend-fg` (accent-ink en light,
 * brand-yellow en dark — piège `.op-chip-div`).
 * Annulée : fond `card-sub`, texte `text-ter`, bordure `border-strong`.
 */
export function OperationStatusTag({
  variant,
  settledLabel = 'Settlée',
  cancelledLabel = 'Annulée',
  className,
}: OperationStatusTagProps) {
  const isSettled = variant === 'settled'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em]',
        'px-2 py-[3px]',
        isSettled
          ? 'bg-data-dividend-tag-50 text-data-dividend-fg'
          : 'bg-card-sub text-text-ter border border-border-strong',
        className
      )}
    >
      {isSettled ? settledLabel : cancelledLabel}
    </span>
  )
}
