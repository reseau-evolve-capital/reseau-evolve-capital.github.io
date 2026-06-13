'use client'

// PollCard (molecule) — ligne d'un vote dans la liste membre /votes (réf spec §5,
// maquette « 5 · Page /votes — liste membre »). Une carte par vote.
//
// Trois statuts visuels (prop `status`) :
//   - 'to_vote' : badge doré « À voter », titre, méta (type · deadline), CTA « Voter ».
//   - 'voted'   : badge vert « ✓ Voté », titre, méta, hint « Résultats disponibles
//                 à la clôture » (ou lien Résultats si déjà visibles).
//   - 'closed'  : badge « Clôturé » + « Clos le X », titre, participation
//                 « X/Y membres ont voté (Z %) », lien « Voir résultats → ».
//
// PRÉSENTATIONNEL STRICT : aucune dépendance data/i18n. Copy via `labels` (défauts FR).
// `onVote` / `onViewResults` callbacks émis au clic. Jamais de NaN à l'écran (participation
// reçue déjà formatée, ou repli « — »).
//
// Tokens uniquement. Badges via l'atome Badge (brand = doré, success = vert).

import * as React from 'react'

import { Badge } from '../../atoms/Badge'
import { Icon } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

export type PollCardStatus = 'to_vote' | 'voted' | 'closed'

export interface PollCardLabels {
  /** Badge statut « À voter ». */
  toVote?: string
  /** Badge statut « ✓ Voté ». */
  voted?: string
  /** Badge statut « Clôturé ». */
  closed?: string
  /** CTA « Voter ». */
  voteCta?: string
  /** Lien « Voir résultats ». */
  resultsCta?: string
  /** Hint affiché pour un vote voté dont les résultats ne sont pas encore visibles. */
  resultsPending?: string
}

const DEFAULTS: Required<PollCardLabels> = {
  toVote: 'À voter',
  voted: '✓ Voté',
  closed: 'Clôturé',
  voteCta: 'Voter',
  resultsCta: 'Voir résultats',
  resultsPending: 'Résultats disponibles à la clôture',
}

export interface PollCardProps {
  /** Titre du vote. */
  title: string
  /** Statut visuel de la carte. */
  status: PollCardStatus
  /** Type lisible (ex. « Choix unique »). */
  type?: string
  /** Deadline lisible (ex. « Clôture 20 juin »). Affichée pour to_vote / voted. */
  deadline?: string
  /** Date de clôture lisible (ex. « Clos le 31 mai »). Affichée pour closed. */
  closedAt?: string
  /** Participation déjà formatée (ex. « 10/12 membres ont voté (83 %) »). closed. */
  participation?: string
  /** Vrai si les résultats sont consultables (live, ou vote clos). Affiche le lien résultats. */
  resultsAvailable?: boolean
  /** Clic « Voter ». */
  onVote?: () => void
  /** Clic « Voir résultats ». */
  onViewResults?: () => void
  /** Copy/a11y (i18n). Défauts FR. */
  labels?: PollCardLabels
  className?: string
}

export function PollCard({
  title,
  status,
  type,
  deadline,
  closedAt,
  participation,
  resultsAvailable,
  onVote,
  onViewResults,
  labels,
  className,
}: PollCardProps) {
  const t = { ...DEFAULTS, ...labels }

  const badge =
    status === 'to_vote' ? (
      <Badge variant="brand">{t.toVote}</Badge>
    ) : status === 'voted' ? (
      <Badge variant="success">{t.voted}</Badge>
    ) : (
      <Badge variant="neutral">{t.closed}</Badge>
    )

  // Méta : closed → « Clos le X », sinon « type · deadline ».
  const meta = status === 'closed' ? (closedAt ?? '') : [type, deadline].filter(Boolean).join(' · ')

  const resultsLink = (
    <button
      type="button"
      onClick={() => onViewResults?.()}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-1.5 self-start rounded-[var(--r-md)] px-1',
        'font-display text-[13px] font-bold text-text',
        'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] outline-none',
        'hover:text-brand-yellow transition-colors duration-[150ms]'
      )}
    >
      {t.resultsCta}
      <Icon name="ArrowRight" size={16} aria-hidden="true" />
    </button>
  )

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-[12px] border border-border bg-card p-4',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {badge}
        {meta ? <span className="truncate text-[12px] text-text-ter">{meta}</span> : null}
      </div>

      <h3 className="font-display text-[15px] font-bold leading-snug text-text">{title}</h3>

      {/* Pied : action selon statut. */}
      {status === 'to_vote' && (
        <button
          type="button"
          onClick={() => onVote?.()}
          className={cn(
            'mt-1 inline-flex min-h-[44px] items-center justify-center gap-1.5 self-start',
            'rounded-[var(--r-md)] border border-brand-yellow bg-brand-yellow/16 px-4',
            'font-display text-[13px] font-bold text-text',
            'transition-colors duration-[150ms] hover:bg-brand-yellow/24',
            'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] outline-none'
          )}
        >
          {t.voteCta}
          <Icon name="ArrowRight" size={16} aria-hidden="true" />
        </button>
      )}

      {status === 'voted' &&
        (resultsAvailable ? (
          resultsLink
        ) : (
          <p className="text-[13px] text-text-ter">{t.resultsPending}</p>
        ))}

      {status === 'closed' && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[13px] text-text-sec">{participation ?? '—'}</span>
          {resultsLink}
        </div>
      )}
    </div>
  )
}
