import { cn } from '../../lib/cn'

export interface ProgressBarProps {
  /** Valeur entre 0 et 100. Les valeurs hors bornes sont clampées automatiquement. */
  value: number
  /** Label ARIA décrivant la progression, ex. "Étape 1 sur 3" */
  label: string
  className?: string
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-1 w-full overflow-hidden rounded-pill bg-border', className)}
    >
      <div
        className="h-full rounded-pill bg-brand-yellow transition-[width] duration-[220ms] ease-out motion-reduce:transition-none"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
