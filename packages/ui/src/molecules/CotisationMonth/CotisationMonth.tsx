import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '../../lib/cn'

export type CotisationVariant = 'paid' | 'late' | 'pending' | 'exempt'

const variantClasses: Record<CotisationVariant, string> = {
  // Jaune Evolve plein : le jaune = accent de marque pour « payé » (cf. réf visuelle).
  // data-positive (vert) est réservé aux gains, sémantiquement faux ici.
  paid: 'bg-brand-yellow hover:opacity-80',
  // late : ROUGE dataviz (data-negative, JAMAIS le rouge brand #E93E3A) — retard = anomalie.
  late: 'bg-data-negative-50 hover:opacity-80',
  pending: 'bg-data-neutral-50 hover:opacity-80',
  exempt: 'bg-neutral-100 opacity-50',
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
                'h-6 w-6 min-h-[24px] min-w-[24px] p-2.5 sm:p-0',
            variantClasses[variant]
          )}
        />
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
