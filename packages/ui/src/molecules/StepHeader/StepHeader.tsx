import * as React from 'react'
import { Icon } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

export interface StepHeaderProps {
  /** Étape courante (1-based). */
  step: number
  /** Nombre total d'étapes. Défaut 3. */
  total?: number
  /** Titre de l'assistant (i18n côté appelant). Défaut FR. */
  title?: string
  /** Libellé du lien retour (i18n côté appelant). Défaut FR. */
  backLabel?: string
  /** Gabarit du libellé « Étape N / M ». `{n}`/`{total}` interpolés. */
  stepLabelTemplate?: string
  /** Callback du lien retour. Si absent et `backHref` absent → bouton sans action. */
  onBack?: () => void
  /** href du lien retour (rendu comme <a> si fourni). */
  backHref?: string
  className?: string
}

/**
 * StepHeader — sous-en-tête collant d'un assistant multi-étapes (E-OPS-2, §4 StepHeader).
 *
 * Lien retour + séparateur + titre, puis l'indicateur d'étapes à droite :
 *   - pill active (step courant)   : 26px
 *   - pill passée (index < step)   : 18px, jaune
 *   - pill future (index > step)   : 18px, border-strong
 * suivi de « Étape N / M ».
 *
 * Purement présentationnel et token-driven (aucun hex). Le caractère collant
 * (`sticky top-0`) est porté ici ; l'appelant fournit le contexte de scroll.
 */
export function StepHeader({
  step,
  total = 3,
  title = 'Nouvelle opération',
  backLabel = 'Opérations',
  stepLabelTemplate = 'Étape {n} / {total}',
  onBack,
  backHref,
  className,
}: StepHeaderProps) {
  const safeTotal = Math.max(1, total)
  const safeStep = Math.min(Math.max(1, step), safeTotal)
  const stepLabel = stepLabelTemplate
    .replace('{n}', String(safeStep))
    .replace('{total}', String(safeTotal))

  const backContent = (
    <>
      <Icon name="ArrowLeft" size={16} aria-hidden="true" />
      <span>{backLabel}</span>
    </>
  )
  const backClasses =
    'inline-flex items-center gap-1.5 font-body text-[13.5px] font-semibold text-text-sec transition-colors duration-[150ms] hover:text-text focus:outline-none focus-visible:shadow-[var(--sh-glow)] rounded-sm'

  return (
    <div
      className={cn(
        'sticky top-0 z-[5] flex h-14 items-center gap-[18px] border-b border-border bg-bg px-8',
        className
      )}
    >
      {backHref ? (
        <a href={backHref} className={backClasses}>
          {backContent}
        </a>
      ) : (
        <button type="button" onClick={onBack} className={backClasses}>
          {backContent}
        </button>
      )}

      <span aria-hidden="true" className="h-[22px] w-px bg-border" />

      <span className="font-display text-[15px] font-bold text-text">{title}</span>

      <div
        role="progressbar"
        aria-label={stepLabel}
        aria-valuenow={safeStep}
        aria-valuemin={1}
        aria-valuemax={safeTotal}
        aria-valuetext={stepLabel}
        className="ml-auto flex items-center gap-3"
      >
        <ol aria-label={stepLabel} className="flex items-center gap-1.5">
          {Array.from({ length: safeTotal }, (_, i) => {
            const n = i + 1
            const isActive = n === safeStep
            const isPast = n < safeStep
            return (
              <li
                key={n}
                aria-hidden="true"
                className={cn(
                  'h-[5px] rounded-pill transition-all duration-[220ms]',
                  isActive ? 'w-[26px] bg-brand-yellow' : 'w-[18px]',
                  !isActive && (isPast ? 'bg-brand-yellow' : 'bg-border-strong')
                )}
              />
            )
          })}
        </ol>
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-text-ter">
          {stepLabel}
        </span>
      </div>
    </div>
  )
}
