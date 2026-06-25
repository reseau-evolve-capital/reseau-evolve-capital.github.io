import * as React from 'react'
import { signedEURWhole } from '@evolve/utils'
import { cn } from '../../lib/cn'

export interface CashDeltaBadgeProps {
  /** Flux de trésorerie signé (€, arrondi). >= 0 → vert, < 0 → rouge dataviz. */
  value: number
  size?: 'md' | 'lg'
  /** Opération annulée : barré + atténué (ne compte plus dans le solde). */
  cancelled?: boolean
  className?: string
}

/**
 * CashDeltaBadge — pastille de delta de trésorerie signé (« +300 € » / « −24 800 € »).
 * Spec : `docs/tickets/design-refs/E-OPS-2-design-spec.md` §2 (CashDeltaBadge).
 *
 * RÈGLE HARD : la perte utilise `--data-negative`, JAMAIS `--brand-red` (#E93E3A).
 * Valeur nulle → « +0 € » sur fond positif (signe neutre). Format via @evolve/utils
 * (signedEURWhole : MINUS U+2212, NBSP, 0 décimale).
 */
export function CashDeltaBadge({
  value,
  size = 'md',
  cancelled = false,
  className,
}: CashDeltaBadgeProps) {
  const positive = !(typeof value === 'number' && value < 0)
  const text = signedEURWhole(value)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill font-display font-bold whitespace-nowrap',
        '[font-feature-settings:"tnum","lnum"]',
        positive
          ? 'bg-data-positive-50 text-data-positive'
          : 'bg-data-negative-50 text-data-negative',
        size === 'lg' ? 'text-[16px] px-3.5 py-[7px]' : 'text-[13.5px] px-[11px] py-[5px]',
        cancelled && 'opacity-50 line-through',
        className
      )}
    >
      {text}
    </span>
  )
}
