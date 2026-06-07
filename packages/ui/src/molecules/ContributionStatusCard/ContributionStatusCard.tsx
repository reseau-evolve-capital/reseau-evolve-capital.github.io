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

/**
 * Carte « statut cotisation » du dashboard — remplace l'affichage brut « En attente »
 * par un indicateur explicite (icône + état + message), avec mise en avant si en retard
 * et rappel du montant dû. Présentationnel : tout le copy est injecté (i18n).
 */
export function ContributionStatusCard({
  status,
  title = 'Statut cotisation',
  statusLabel,
  message,
  amountDueLabel,
  className,
}: ContributionStatusCardProps) {
  const s = STATUS_STYLE[status]
  const showAmount =
    (status === 'late' || status === 'pending') && amountDueLabel != null && amountDueLabel !== ''

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
