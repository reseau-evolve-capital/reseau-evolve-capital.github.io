import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '../../lib/cn'

export type CotisationVariant = 'paid' | 'late' | 'pending' | 'exempt'

const variantClasses: Record<CotisationVariant, string> = {
  // Jaune Evolve plein : le jaune = accent de marque pour « payé » (cf. réf visuelle).
  // data-positive (vert) est réservé aux gains, sémantiquement faux ici.
  paid: 'bg-brand-yellow hover:opacity-80',
  // late : ROUGE dataviz plein (data-negative = #C53030 light / #F87171 dark, JAMAIS le rouge brand #E93E3A) — retard = anomalie critique visible.
  late: 'bg-data-negative hover:opacity-80',
  pending: 'bg-data-neutral-50 hover:opacity-80',
  exempt: 'bg-neutral-100 opacity-50',
}

/** Icône textuelle centrée dans la cellule (md uniquement, trop petit pour sm). */
function CellIcon({ variant }: { variant: CotisationVariant }) {
  if (variant === 'paid') {
    return (
      <span
        aria-hidden="true"
        className="pointer-events-none select-none text-[10px] font-bold leading-none text-neutral-900/70"
      >
        ✓
      </span>
    )
  }
  if (variant === 'late') {
    return (
      <span
        aria-hidden="true"
        className="pointer-events-none select-none text-[10px] font-bold leading-none text-white/90"
      >
        !
      </span>
    )
  }
  if (variant === 'pending') {
    return (
      <span
        aria-hidden="true"
        className="pointer-events-none block h-1.5 w-1.5 rounded-full bg-text-ter/60"
      />
    )
  }
  return null
}

export interface CotisationMonthProps {
  variant: CotisationVariant
  tooltip: string
  size?: 'sm' | 'md'
  'aria-label': string
}

export function CotisationMonth({
  variant,
  tooltip,
  size = 'md',
  'aria-label': ariaLabel,
}: CotisationMonthProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label={ariaLabel}
          className={cn(
            'box-content rounded-sm bg-clip-content transition-opacity duration-[150ms]',
            'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]',
            // La couleur ne remplit que la « content box » (bg-clip-content) : la pastille
            // reste visuellement compacte (12px en sm, 24px en md) tandis que le padding
            // élargit la cible TACTILE sans la colorer.
            size === 'sm'
              ? 'h-3 w-3'
              : // Cible tactile ≥ 44×44px sur mobile (24px de pastille + 2×10px de padding).
                // Sur ≥ sm (pointeur fin), on revient au rendu compact 24px sans padding.
                'inline-flex h-6 w-6 min-h-[24px] min-w-[24px] items-center justify-center p-2.5 sm:p-0',
            variantClasses[variant]
          )}
        >
          {size === 'md' && <CellIcon variant={variant} />}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={4}
          className="z-50 bg-card border border-border rounded-[10px] shadow-[var(--sh-pop)] px-3 py-2 text-[12px] text-text max-w-[200px]"
        >
          {tooltip}
          <Popover.Arrow className="fill-card" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
