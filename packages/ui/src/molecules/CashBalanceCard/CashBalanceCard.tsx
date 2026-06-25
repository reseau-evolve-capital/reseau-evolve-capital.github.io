import * as React from 'react'
import { formatEURWhole } from '@evolve/utils'
import { Icon } from '../../atoms/Icon'
import { InfoTip } from '../../atoms/InfoTip'
import { Skeleton } from '../../atoms/Skeleton'
import { cn } from '../../lib/cn'

export type CashBalanceState = 'ok' | 'empty' | 'loading' | 'error'

export interface BrokerReconciliation {
  /** Cohérent avec le courtier (true) ou écart détecté (false). */
  consistent: boolean
  /** Nom du courtier (ex. « Bourse Direct »). */
  brokerName: string
  /** Action au clic (ouvre le rapprochement). */
  onOpen?: () => void
}

export interface CashBalanceCardProps {
  /** Solde espèces (€). NEUTRE même si négatif. null → fallback « — ». */
  balance: number | null
  /** État d'affichage. Défaut « ok ». */
  state?: CashBalanceState
  /** Libellé caption. Défaut FR. */
  captionLabel?: string
  /** Texte de la bulle d'info. Défaut FR. */
  infoText?: string
  /** Libellé accessible du bouton (i). Défaut FR. */
  infoLabel?: string
  /** Horodatage « calculé il y a … ». Optionnel. */
  computedAtLabel?: string
  /** Badge de cohérence courtier (colonne droite). Optionnel. */
  brokerReconciliation?: BrokerReconciliation
  /** Texte d'invitation affiché en état « empty ». Défaut FR. */
  emptyHint?: string
  /** Message d'erreur. Défaut FR. */
  errorMessage?: string
  /** Libellé du bouton réessayer. Défaut FR. */
  retryLabel?: string
  onRetry?: () => void
  className?: string
}

const FALLBACK = '—'

/** Caption « 10px mono uppercase » du module Opérations (équivalent `.ec-caption`). */
const CAPTION = 'font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-text-ter'

/**
 * CashBalanceCard — carte « Solde espèces » du tableau de bord Opérations.
 * Spec : `docs/tickets/design-refs/E-OPS-2-design-spec.md` §3.1.
 *
 * - Montant Tommy Soft 54px, NEUTRE (text-text) même si négatif (seul le
 *   CashDeltaBadge colore par signe).
 * - `aria-live="polite"` sur le montant (mise à jour annoncée).
 * - États ok / empty / loading / error pilotés par prop (jamais de NaN à l'écran ;
 *   fallback « — »). Tout libellé en prop avec défaut FR (i18n côté apps/web).
 */
export function CashBalanceCard({
  balance,
  state = 'ok',
  captionLabel = 'Solde espèces',
  infoText = 'Argent disponible sur le compte du club, hors titres détenus.',
  infoLabel = 'Qu’est-ce que le solde espèces ?',
  computedAtLabel,
  brokerReconciliation,
  emptyHint = 'Enregistre une première opération pour calculer le solde espèces du club.',
  errorMessage = 'Impossible de calculer le solde espèces.',
  retryLabel = 'Réessayer',
  onRetry,
  className,
}: CashBalanceCardProps) {
  const baseCard = cn(
    'relative bg-card border border-border rounded-lg shadow-[var(--sh-card)]',
    'px-7 py-[26px]',
    className
  )

  if (state === 'loading') {
    return (
      <div className={baseCard} aria-busy="true">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-col gap-3">
            <Skeleton width={110} height={10} radius="4px" />
            <Skeleton width={220} height={48} radius="8px" />
            <Skeleton width={150} height={11} radius="4px" />
          </div>
          <Skeleton width={210} height={54} radius="9999px" />
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className={cn(baseCard, 'overflow-hidden border-data-negative/40')} role="alert">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-yellow via-brand-orange to-brand-red"
        />
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-data-warning-50 text-data-warning">
            <Icon name="TriangleAlert" size={24} />
          </span>
          <div className="flex-1 min-w-[180px]">
            <p className={cn(CAPTION, 'mb-1')}>{captionLabel}</p>
            <p className="text-[14px] text-text-sec">{errorMessage}</p>
          </div>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-[44px] items-center rounded-pill border border-border-strong bg-card px-[22px] font-body text-[14px] font-bold text-text transition-[border-color,transform] duration-[150ms] hover:border-text-ter active:scale-[0.985]"
            >
              {retryLabel}
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  const hasBalance = typeof balance === 'number' && isFinite(balance)
  const amountText = hasBalance ? formatEURWhole(balance) : FALLBACK

  return (
    <div className={cn(baseCard, 'flex flex-wrap items-center justify-between gap-6')}>
      <div className="flex flex-col">
        <span className="mb-1 inline-flex items-center gap-1.5">
          <span className={CAPTION}>{captionLabel}</span>
          <InfoTip content={infoText} aria-label={infoLabel} side="top" />
        </span>
        <span
          aria-live="polite"
          className={cn(
            'font-display font-black text-text leading-[0.95]',
            'text-[54px] tracking-[-0.035em] [font-feature-settings:"tnum","lnum"]'
          )}
        >
          {amountText}
        </span>
        {computedAtLabel ? (
          <span className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-text-ter">
            <Icon name="Clock" size={16} className="shrink-0" />
            {computedAtLabel}
          </span>
        ) : null}
      </div>

      {state === 'empty' ? (
        <p className="max-w-[280px] text-[14px] text-text-sec">{emptyHint}</p>
      ) : brokerReconciliation ? (
        <BrokerBadge {...brokerReconciliation} />
      ) : null}
    </div>
  )
}

function BrokerBadge({ consistent, brokerName, onOpen }: BrokerReconciliation) {
  const interactive = typeof onOpen === 'function'
  const title = consistent ? `Cohérent avec ${brokerName}` : `Écart avec ${brokerName}`
  const sub = 'Vérifier le rapprochement →'
  const ariaLabel = `${title} — ouvrir la vérification`

  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-pill text-neutral-0',
          consistent ? 'bg-data-positive' : 'bg-data-warning'
        )}
      >
        <Icon name={consistent ? 'Check' : 'TriangleAlert'} size={16} strokeWidth={2.6} />
      </span>
      <span className="flex flex-col">
        <span
          className={cn(
            'font-display text-[14px] font-bold',
            consistent ? 'text-data-positive' : 'text-data-warning'
          )}
        >
          {title}
        </span>
        <span className="text-[12px] text-text-ter">{sub}</span>
      </span>
    </>
  )

  const baseClass = cn(
    'inline-flex items-center gap-3 rounded-pill py-3 pl-3.5 pr-4',
    consistent
      ? 'bg-data-positive-50 border border-data-positive/30'
      : 'bg-data-warning-50 border border-data-warning/30',
    interactive && 'transition-transform duration-[150ms] active:scale-[0.985]'
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen?.()
    }
  }

  if (interactive) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={onOpen}
        onKeyDown={onKeyDown}
        className={baseClass}
      >
        {content}
      </div>
    )
  }

  // Non-interactif : pas d'aria-label sur le <div> (role implicite generic l'ignore,
  // WCAG 4.1.2). Le texte visible (title + sub) porte déjà toute l'information.
  return <div className={baseClass}>{content}</div>
}
