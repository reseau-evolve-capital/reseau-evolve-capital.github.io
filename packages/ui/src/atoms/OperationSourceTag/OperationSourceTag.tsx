import * as React from 'react'
import { cn } from '../../lib/cn'

export type OperationSourceVariant = 'manual' | 'migrated'

export interface OperationSourceTagProps {
  variant: OperationSourceVariant
  /** Copy FR par défaut, surchargeable (i18n côté apps/web). */
  manualLabel?: string
  migratedLabel?: string
  className?: string
}

/**
 * OperationSourceTag — origine d'une opération (saisie manuelle / migrée matrice).
 * Spec : `docs/tickets/design-refs/E-OPS-2-design-spec.md` §5 (SourceTag).
 *
 * Manuel : puce ronde neutre. Migré : puce carrée ambre.
 * Texte IBM Plex Mono 9.5px uppercase, `--text-ter`.
 */
export function OperationSourceTag({
  variant,
  manualLabel = 'Manuel',
  migratedLabel = 'Migré',
  className,
}: OperationSourceTagProps) {
  const isManual = variant === 'manual'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-text-ter',
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-1.5 w-1.5 opacity-70',
          isManual ? 'rounded-pill bg-data-neutral' : 'rounded-[2px] bg-data-warning'
        )}
      />
      {isManual ? manualLabel : migratedLabel}
    </span>
  )
}
