import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '../../lib/cn'

export type CotisationVariant = 'paid' | 'pending' | 'late' | 'future' | 'not_applicable'

const variantClasses: Record<CotisationVariant, string> = {
  // Jaune Evolve plein : le jaune = accent de marque pour « payé » (cf. réf visuelle).
  // data-positive (vert) est réservé aux gains, sémantiquement faux ici.
  paid: 'bg-brand-yellow hover:opacity-80',
  // pending : mois courant en attente (gris neutre data).
  pending: 'bg-data-neutral-50 hover:opacity-80',
  // late : ROUGE dataviz PLEIN (data-negative = #C53030 light / #F87171 dark, JAMAIS le rouge brand #E93E3A
  // ni le tint pâle data-negative-50) — retard = anomalie critique visible.
  late: 'bg-data-negative hover:opacity-80',
  // future : mois à venir (année courante). Fond n-50 clippé sur la content-box ;
  // l'anneau POINTILLÉ n-500 (#8A8B8C → ≈3,3:1 sur n-50, passe l'AA non-texte WCAG 1.4.11 ;
  // n-400 #B3B5B7 ne donnait que 1,97:1) est tracé par un overlay interne calé sur la pastille
  // (pas via une border sur le bouton : box-content + padding la tracerait autour de la
  // touch-area 44px, pas de la pastille 24px). Pas de glyphe : le pointillé porte le sens.
  future: 'relative bg-neutral-50 hover:opacity-80',
  // not_applicable : mois antérieur à l'adhésion (ou exempté). Fond n-100 atténué, glyphe « – ».
  not_applicable: 'bg-neutral-100 opacity-60',
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
  if (variant === 'not_applicable') {
    return (
      <span
        aria-hidden="true"
        className="pointer-events-none select-none text-[10px] font-bold leading-none text-neutral-400"
      >
        –
      </span>
    )
  }
  if (variant === 'future') {
    // Anneau pointillé n-400 calé sur la pastille (24px md). Pas de glyphe : le pointillé
    // porte le sens « à venir ». Span décoratif (le fond n-50 vit sur le bouton).
    return (
      <span
        aria-hidden="true"
        className="pointer-events-none block h-6 w-6 rounded-sm border-2 border-dashed border-neutral-500"
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
              ? // En sm pas de glyphe interne → l'anneau pointillé « future » est tracé
                // par une border sur le bouton (p-0 ici : border-box = pastille 12px).
                cn('h-3 w-3', variant === 'future' && 'border border-dashed border-neutral-500')
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
