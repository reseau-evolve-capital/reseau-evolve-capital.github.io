'use client'

// Stepper (NET-006) — fil d'Ariane horizontal d'un assistant multi-étapes.
//
// Présentationnel & ZÉRO i18n : les libellés d'étapes (`steps[].label`) et le nom accessible
// du groupe (`ariaLabel`) sont injectés par l'appelant. Pattern de référence : l'assistant
// « Ajouter un club » (E-NET §Écran 2) — pastilles numérotées 30px reliées par un trait.
//
// États d'une étape (dérivés de `current`) :
//   - complétée (index < current) : pastille `bg-accent-ink` + check `text-brand-yellow`,
//     label `text-text-sec`, trait suivant plein (`bg-accent-ink`).
//   - active (index === current) : pastille `bg-accent` + chiffre `text-accent-ink`,
//     label `text-text` weight 800, `aria-current="step"`.
//   - à venir (index > current) : pastille `bg-card` + chiffre `text-text-ter` + bordure,
//     label `text-text-ter`, trait précédent neutre (`bg-border`).
//
// a11y : `<ol>` sémantique nommé par `ariaLabel` ; l'étape active porte `aria-current="step"` ;
// le check / le chiffre sont `aria-hidden` (le label porte le sens). Tokens design-system
// uniquement (aucun hex). Réf : SegmentedToggle (présentationnel + tokens), CLAUDE.md (a11y AA).

import * as React from 'react'

import { Icon } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

export interface StepperStep {
  /** Identifiant stable de l'étape (clé React). */
  id: string
  /** Libellé visible (i18n côté appelant). */
  label: string
}

export interface StepperProps {
  steps: StepperStep[]
  /** Index (0-based) de l'étape active. Les étapes < current sont « complétées ». */
  current: number
  /** Nom accessible du fil d'étapes (i18n côté appelant). */
  ariaLabel: string
  className?: string
}

/**
 * Fil d'étapes horizontal. Purement présentationnel : `current` pilote les 3 états visuels.
 * Le composant ne navigue pas — l'appelant contrôle `current`.
 */
export function Stepper({ steps, current, ariaLabel, className }: StepperProps) {
  return (
    <ol
      aria-label={ariaLabel}
      className={cn(
        'flex items-center gap-0 rounded-md border border-border bg-card px-6 py-5 shadow-[var(--sh-card)]',
        className
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = index < current
        const isActive = index === current
        const isLast = index === steps.length - 1

        return (
          <React.Fragment key={step.id}>
            <li
              className="flex shrink-0 items-center gap-2.5"
              {...(isActive ? { 'aria-current': 'step' as const } : {})}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-[30px] w-[30px] items-center justify-center rounded-full font-display text-[13px] font-extrabold',
                  isCompleted && 'bg-accent-ink text-brand-yellow',
                  isActive && 'bg-accent text-accent-ink',
                  !isCompleted && !isActive && 'border border-border-strong bg-card text-text-ter'
                )}
              >
                {isCompleted ? <Icon name="Check" size={16} aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn(
                  'font-display text-[13.5px]',
                  isActive ? 'font-extrabold text-text' : 'font-semibold',
                  isCompleted && 'text-text-sec',
                  !isCompleted && !isActive && 'text-text-ter'
                )}
              >
                {step.label}
              </span>
            </li>

            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  'mx-4 h-[1.5px] min-w-[24px] flex-1 rounded-full',
                  // Trait plein tant que l'étape qui suit le segment est déjà atteinte (complétée
                  // ou active), neutre au-delà.
                  index < current ? 'bg-accent-ink' : 'bg-border'
                )}
              />
            )}
          </React.Fragment>
        )
      })}
    </ol>
  )
}
