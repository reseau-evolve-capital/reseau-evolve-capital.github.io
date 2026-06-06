import * as React from 'react'
import { cn } from '../../lib/cn'

export interface SegmentedProgressProps {
  /** Numéro de l'étape courante (1-indexé). */
  step: number
  /** Nombre total d'étapes (nombre de segments rendus). */
  total: number
  /** Label ARIA décrivant la progression, ex. « Étape 2 sur 3 ». */
  label: string
  className?: string
}

/**
 * Indicateur de progression segmenté de l'onboarding (réf desktop : 3 barres).
 *
 * Chaque étape a son propre segment :
 * - étape franchie → barre pleine (token `text` / sombre),
 * - étape courante → barre rayée jaune brand (motif diagonal),
 * - étape à venir → barre neutre discrète.
 *
 * Présentationnel et accessible : expose un unique `role="progressbar"`
 * (les segments visuels sont décoratifs, `aria-hidden`). Le motif rayé est en
 * `currentColor` via `background-image`, donc thémé clair/sombre sans hex codé.
 */
export const SegmentedProgress = React.forwardRef<HTMLDivElement, SegmentedProgressProps>(
  ({ step, total, label, className }, ref) => {
    // Clamp défensif : jamais de NaN/segments négatifs à l'écran.
    const safeTotal = Math.max(1, Math.floor(total) || 1)
    const safeStep = Math.min(safeTotal, Math.max(1, Math.floor(step) || 1))
    const segments = Array.from({ length: safeTotal }, (_, i) => i + 1)

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={safeStep}
        aria-valuemin={1}
        aria-valuemax={safeTotal}
        aria-label={label}
        className={cn('flex w-full min-w-0 items-center gap-2', className)}
      >
        {segments.map((index) => {
          const isDone = index < safeStep
          const isActive = index === safeStep
          return (
            <span
              key={index}
              aria-hidden="true"
              className={cn(
                'h-1.5 flex-1 rounded-pill transition-colors duration-[220ms] ease-out motion-reduce:transition-none',
                // Étape franchie : barre pleine, contrastée (suit le texte → thémée).
                isDone && 'bg-text',
                // Étape à venir : neutre discret.
                !isDone && !isActive && 'bg-border'
              )}
              // Étape courante : rayures diagonales jaune brand (motif CSS, pas de hex).
              style={
                isActive
                  ? {
                      backgroundColor: 'var(--color-brand-yellow)',
                      backgroundImage:
                        'repeating-linear-gradient(-45deg, color-mix(in srgb, var(--color-neutral-900) 28%, transparent) 0 4px, transparent 4px 8px)',
                    }
                  : undefined
              }
            />
          )
        })}
      </div>
    )
  }
)
SegmentedProgress.displayName = 'SegmentedProgress'
