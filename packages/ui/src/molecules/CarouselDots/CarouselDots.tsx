import * as React from 'react'
import { cn } from '../../lib/cn'

export interface CarouselDotsProps {
  /** Nombre total de slides */
  count: number
  /** Index de la slide active (0-indexé) */
  active: number
  /** Callback appelé lors du clic sur un point */
  onSelect: (index: number) => void
  className?: string
}

/** Indicateurs de pagination pour un carrousel. Chaque point est un bouton accessible. */
export function CarouselDots({ count, active, onSelect, className }: CarouselDotsProps) {
  return (
    <div
      role="group"
      aria-label="Choisir une diapositive"
      className={cn('flex items-center justify-center gap-3', className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Aller à la slide ${i + 1}`}
          aria-current={i === active ? 'true' : undefined}
          onClick={() => onSelect(i)}
          className="grid h-11 w-11 place-items-center focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]"
        >
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-pill transition-transform',
              i === active ? 'scale-125 bg-brand-yellow' : 'bg-border'
            )}
          />
        </button>
      ))}
    </div>
  )
}
