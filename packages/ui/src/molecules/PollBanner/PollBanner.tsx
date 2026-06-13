'use client'

// PollBanner (molecule) — bannière dashboard de découverte d'un vote ouvert.
//
// S'insère au-dessus des KPI cards du dashboard, sous l'AppTopbar (réf spec §5,
// maquette « 1 · PollBanner »). Fond teinté accent (brand.yellow translucide),
// BORDURE GAUCHE 3px dorée, radius 12px, CTA « Voter → » ≥ 44px, focus doré.
//
// Deux variantes d'affichage :
//   - 'single' (défaut) : titre du vote + type + deadline + CTA « Voter ». 1 ou 2
//     bannières peuvent être empilées par l'appelant (chaque vote = un PollBanner).
//   - 'aggregate' : quand ≥ 3 votes ouverts non répondus, une seule bannière agrégée
//     « X votes en attente de votre réponse » + sous-titre d'échéances + « Voir tous ».
//
// PRÉSENTATIONNEL STRICT (CLAUDE.md) : aucune dépendance à packages/data ni i18n.
// Toute la copy arrive par props (`labels`) avec des défauts FR. `onVote` / `onViewAll`
// sont des callbacks émis au clic (l'appelant câble navigation + GA4 poll_banner_click).
//
// Tokens uniquement, jamais de hex en dur. Le doré est l'accent légitime de marque
// (brand.yellow), jamais le rouge brand #E93E3A.

import * as React from 'react'

import { Icon } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

export type PollBannerVariant = 'single' | 'aggregate'

export interface PollBannerLabels {
  /** Libellé du type de vote (ex. « Choix unique », « Oui / Non »). */
  typeLabel?: string
  /** Préfixe de la deadline (ex. « Clôture 20 juin »). */
  deadlineLabel?: string
  /** CTA principal (variante single). Défaut « Voter ». */
  voteCta?: string
  /** CTA de la variante agrégée. Défaut « Voir tous ». */
  viewAllCta?: string
  /** Gabarit du titre agrégé ; « {count} » remplacé par le nombre. */
  aggregateTitle?: string
  /** Sous-titre agrégé (échéances). */
  aggregateSubtitle?: string
}

const DEFAULTS: Required<
  Omit<PollBannerLabels, 'typeLabel' | 'deadlineLabel' | 'aggregateSubtitle'>
> & {
  typeLabel: string
  deadlineLabel: string
  aggregateSubtitle: string
} = {
  typeLabel: '',
  deadlineLabel: '',
  voteCta: 'Voter',
  viewAllCta: 'Voir tous',
  aggregateTitle: '{count} votes en attente de votre réponse',
  aggregateSubtitle: '',
}

export interface PollBannerProps {
  /** Titre du vote (variante single). */
  title?: string
  /** Type lisible du vote (ex. « Choix unique »). Affiché en méta sous le titre. */
  type?: string
  /** Deadline lisible (ex. « Clôture 20 juin »). Affichée en méta. */
  deadline?: string
  /** Variante d'affichage. Défaut 'single'. */
  variant?: PollBannerVariant
  /** Nombre de votes en attente (variante 'aggregate'). */
  count?: number
  /** Sous-titre d'échéances (variante 'aggregate'), ex. « Échéances entre le 18 et le 30 juin ». */
  aggregateSubtitle?: string
  /** Clic sur « Voter » (variante single). L'appelant câble nav + GA4. */
  onVote?: () => void
  /** Clic sur « Voir tous » (variante aggregate). */
  onViewAll?: () => void
  /** Copy/a11y (i18n). Défauts FR. */
  labels?: PollBannerLabels
  className?: string
}

/** CTA outline doré, ≥ 44px, focus glow. Partagé single/aggregate. */
const ctaClass = cn(
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[var(--r-md)] px-4',
  'min-h-[44px] border border-brand-yellow bg-brand-yellow/16 text-text',
  'font-display text-[13px] font-bold',
  'transition-colors duration-[150ms] hover:bg-brand-yellow/24',
  'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] outline-none'
)

export function PollBanner({
  title,
  type,
  deadline,
  variant = 'single',
  count = 0,
  aggregateSubtitle,
  onVote,
  onViewAll,
  labels,
  className,
}: PollBannerProps) {
  const t = { ...DEFAULTS, ...labels }

  // Conteneur commun : fond teinté accent + bordure gauche 3px dorée + radius 12px.
  const container = cn(
    'flex items-center justify-between gap-4 rounded-[12px] border border-border',
    'border-l-[3px] border-l-brand-yellow bg-brand-yellow/10 px-4 py-3',
    className
  )

  if (variant === 'aggregate') {
    const aggTitle = t.aggregateTitle.replace('{count}', String(Math.max(0, count)))
    const subtitle = aggregateSubtitle ?? t.aggregateSubtitle
    return (
      <div role="status" aria-live="polite" className={container}>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-display text-[15px] font-bold text-text">{aggTitle}</span>
          {subtitle ? <span className="truncate text-[13px] text-text-sec">{subtitle}</span> : null}
        </span>
        <button type="button" onClick={() => onViewAll?.()} className={ctaClass}>
          {t.viewAllCta}
          <Icon name="ArrowRight" size={16} aria-hidden="true" />
        </button>
      </div>
    )
  }

  // Variante single : titre + méta (type · deadline) + CTA « Voter ».
  const meta = [type, deadline].filter(Boolean).join(' · ')
  return (
    <div role="status" aria-live="polite" className={container}>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-display text-[15px] font-bold text-text">
          {title ?? '—'}
        </span>
        {meta ? <span className="truncate text-[13px] text-text-sec">{meta}</span> : null}
      </span>
      <button type="button" onClick={() => onVote?.()} className={ctaClass}>
        {t.voteCta}
        <Icon name="ArrowRight" size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
