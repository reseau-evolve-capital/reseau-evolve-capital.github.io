import * as React from 'react'
import { ProgressBar } from '../../atoms/ProgressBar'
import { cn } from '../../lib/cn'

export interface ProgressHeaderProps {
  /** Numéro de l'étape courante (1-indexé) */
  step: number
  /** Nombre total d'étapes */
  total: number
  /**
   * Gabarit du libellé de progression — défaut `(step, total) => `Étape ${step} sur ${total}``.
   * Sert à la fois au texte affiché et à l'aria-label de la ProgressBar.
   */
  formatLabel?: (step: number, total: number) => string
  className?: string
}

/** En-tête de progression pour les formulaires multi-étapes. Compose ProgressBar. */
export function ProgressHeader({
  step,
  total,
  formatLabel = (s, t) => `Étape ${s} sur ${t}`,
  className,
}: ProgressHeaderProps) {
  const label = formatLabel(step, total)

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-ter">{label}</p>
      <ProgressBar value={(step / total) * 100} label={label} />
    </div>
  )
}
