import * as React from 'react'
import { ProgressBar } from '../../atoms/ProgressBar'
import { cn } from '../../lib/cn'

export interface ProgressHeaderProps {
  /** Numéro de l'étape courante (1-indexé) */
  step: number
  /** Nombre total d'étapes */
  total: number
  className?: string
}

/** En-tête de progression pour les formulaires multi-étapes. Compose ProgressBar. */
export function ProgressHeader({ step, total, className }: ProgressHeaderProps) {
  const label = `Étape ${step} sur ${total}`

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-ter">{label}</p>
      <ProgressBar value={(step / total) * 100} label={label} />
    </div>
  )
}
