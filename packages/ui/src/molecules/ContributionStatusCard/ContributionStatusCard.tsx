'use client'
import * as React from 'react'
import { Icon, type IconName } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

/** États de cotisation parlants côté membre. `late` = pas à jour (mois en cours non couvert). */
export type ContributionStatusValue = 'ok' | 'pending' | 'late' | 'exempt'

export interface ContributionStatusCardProps {
  status: ContributionStatusValue
  /** Titre du bloc (i18n). Défaut FR. */
  title?: string
  /** Libellé d'état déjà localisé (ex. « À jour », « En retard »). */
  statusLabel: string
  /** Message court d'explication déjà localisé (ex. « Tu es à jour. »). */
  message?: string
  /** Montant dû déjà formaté (ex. « 150,00 € »), mis en avant si `late`/`pending`. */
  amountDueLabel?: string | null
  /** `default` (inchangé) ou `compact` : header 1 ligne titre + badge pill (dashboard V2). */
  variant?: 'default' | 'compact'
  className?: string
}

const STATUS_STYLE: Record<
  ContributionStatusValue,
  { icon: IconName; chip: string; ring: string }
> = {
  // « à jour » = positif (vert dataviz). JAMAIS le rouge brand pour un état négatif (cf. CLAUDE.md).
  ok: { icon: 'Check', chip: 'bg-data-positive-50 text-data-positive', ring: 'border-border' },
  pending: {
    icon: 'Clock',
    chip: 'bg-data-neutral-50 text-data-neutral',
    ring: 'border-border',
  },
  // « en retard » = avertissement (orange dataviz) + mise en avant de la carte.
  late: {
    icon: 'TriangleAlert',
    chip: 'bg-data-warning-50 text-data-warning-strong',
    ring: 'border-2 border-data-warning',
  },
  exempt: { icon: 'Minus', chip: 'bg-neutral-100 text-text-ter', ring: 'border-border' },
}

/** Compact (V2) : `pending` passe en style warning — arbitrage lead conforme maquette V2. */
const COMPACT_PENDING_CHIP = 'bg-data-warning-50 text-data-warning-strong'

/**
 * Carte « statut cotisation » du dashboard — remplace l'affichage brut « En attente »
 * par un indicateur explicite (icône + état + message), avec mise en avant si en retard
 * et rappel du montant dû. Présentationnel : tout le copy est injecté (i18n).
 * `variant="compact"` (dashboard V2) : header 1 ligne (titre + badge pill), message dessous.
 */
export function ContributionStatusCard({
  status,
  title = 'Statut cotisation',
  statusLabel,
  message,
  amountDueLabel,
  variant = 'default',
  className,
}: ContributionStatusCardProps) {
  const s = STATUS_STYLE[status]
  const showAmount =
    (status === 'late' || status === 'pending') && amountDueLabel != null && amountDueLabel !== ''

  if (variant === 'compact') {
    const chip = status === 'pending' ? COMPACT_PENDING_CHIP : s.chip
    return (
      <div
        className={cn(
          'flex flex-col gap-1 rounded-[10px] bg-card px-4 py-3 shadow-[var(--sh-card)]',
          s.ring,
          className
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-[14px] font-bold text-text">{title}</p>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold',
              chip
            )}
          >
            <Icon name={s.icon} size={16} className="h-3 w-3" aria-hidden="true" />
            {statusLabel}
          </span>
        </div>
        {message ? <p className="text-[13px] leading-snug text-text-sec">{message}</p> : null}
        {showAmount ? (
          <p className="text-[13px] font-semibold text-data-warning-strong">{amountDueLabel}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-[14px] bg-card p-5 shadow-[var(--sh-card)]',
        s.ring,
        className
      )}
    >
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-ter">{title}</p>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
            s.chip
          )}
        >
          <Icon name={s.icon} size={16} aria-hidden="true" />
        </span>
        <span className="font-display text-[18px] font-bold text-text">{statusLabel}</span>
      </div>
      {message ? <p className="text-[13px] leading-snug text-text-sec">{message}</p> : null}
      {showAmount ? (
        <p className="text-[13px] font-semibold text-data-warning-strong">{amountDueLabel}</p>
      ) : null}
    </div>
  )
}
