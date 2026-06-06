'use client'

// Organisme Banner (NTF-006) — bandeau de feedback inline, généralisation du SyncBanner.
//
// Carte arrondie, fond tinté selon la variante, icône + (titre) + message + slot actions
// + bouton fermer optionnel. Cinq variantes : info / success / warning / error / sync.
// Couvre les cas produit : statut de sync, accès suspendu (bloquant), relance cotisation /
// impayé, info club.
//
// Règles CLAUDE.md respectées :
//   - États sémantiques via tokens : succès=data-positive, erreur=data-negative,
//     warning=data-warning (TEXTE = data-warning-strong, AA-safe), info=accent brand.yellow,
//     sync=surface neutre THÉMÉE (bg-card-sub + bg-border, bascule light/dark). Le rouge brand
//     n'est JAMAIS utilisé pour un état (le jaune l'est : c'est l'accent légitime de la marque).
//   - Zéro hex en dur : uniquement des classes utilitaires thémées (light + dark via data-theme).
//   - error → role="alert"/aria-live="assertive" ; autres → role="status"/aria-live="polite".
//   - Bouton fermer ≥ 44×44px, focus visible (--sh-glow), aria-label explicite.
//   - Icône « chipée » : glyphe centré dans un chip 32×32 à fond teinté de la variante.
//
// Présentationnel : aucune dépendance à packages/data. Copy via props optionnelles.

import * as React from 'react'

import { Icon, type IconName } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

export type BannerVariant = 'info' | 'success' | 'warning' | 'error' | 'sync'

interface VariantStyle {
  /** Icône lucide par défaut de la variante. */
  icon: IconName
  /** Conteneur : fond tinté + bordure. */
  container: string
  /** Couleur de l'icône. */
  iconColor: string
  /** Fond teinté du chip d'icône. */
  chip: string
  /** Couleur du titre (texte fort, AA-safe). */
  title: string
}

// Mapping variante → tokens. text-data-warning-strong est l'ambre foncé AA-safe sur fond clair
// (≠ --data-warning vif, réservé icônes/bordures). info = accent brand.yellow (surface jaune
// translucide ~16%). En dark, ces tokens basculent automatiquement.
const VARIANT_STYLES: Record<BannerVariant, VariantStyle> = {
  info: {
    icon: 'Info',
    container: 'bg-brand-yellow/10 border-border',
    iconColor: 'text-brand-yellow',
    chip: 'bg-brand-yellow/16',
    title: 'text-text',
  },
  success: {
    // lucide v0.474 : CircleCheck (ex-CheckCircle).
    icon: 'CircleCheck',
    container: 'bg-data-positive-50 border-border',
    iconColor: 'text-data-positive',
    chip: 'bg-data-positive-50',
    title: 'text-text',
  },
  warning: {
    // lucide v0.474 : TriangleAlert (ex-AlertTriangle).
    icon: 'TriangleAlert',
    container: 'bg-data-warning-50 border-border',
    iconColor: 'text-data-warning',
    chip: 'bg-data-warning-50',
    title: 'text-data-warning-strong',
  },
  error: {
    // lucide v0.474 : CircleAlert (ex-AlertCircle).
    icon: 'CircleAlert',
    container: 'bg-data-negative-50 border-border',
    iconColor: 'text-data-negative',
    chip: 'bg-data-negative-50',
    title: 'text-data-negative',
  },
  sync: {
    // C5b : tokens SÉMANTIQUES thémés (≠ neutres bruts bg-neutral-100/200 qui ne
    // basculaient jamais en dark). bg-card-sub + bg-border flippent via [data-theme="dark"].
    icon: 'RefreshCw',
    container: 'bg-card-sub border-border',
    iconColor: 'text-text-sec',
    chip: 'bg-border',
    title: 'text-text',
  },
}

export interface BannerProps {
  variant: BannerVariant
  /** Message principal (corps). Toujours requis. */
  message: React.ReactNode
  /** Titre optionnel (semibold), au-dessus du message. */
  title?: React.ReactNode
  /** Slot d'actions à droite (boutons, liens). */
  actions?: React.ReactNode
  /**
   * Placement des actions :
   *   - 'stacked' (défaut) : sous le message (cas multi-actions/bloquant),
   *   - 'inline' : à droite du message, sur la même ligne (cas compact type SyncBanner).
   */
  actionsLayout?: 'inline' | 'stacked'
  /** Affiche un bouton fermer. Défaut false. */
  dismissible?: boolean
  /** Callback du bouton fermer. */
  onDismiss?: () => void
  /** Icône personnalisée (sinon icône par défaut de la variante). */
  icon?: IconName
  /** aria-label du bouton fermer. Défaut « Fermer ». */
  dismissAriaLabel?: string
  className?: string
}

export function Banner({
  variant,
  message,
  title,
  actions,
  actionsLayout = 'stacked',
  dismissible = false,
  onDismiss,
  icon,
  dismissAriaLabel = 'Fermer',
  className,
}: BannerProps) {
  const style = VARIANT_STYLES[variant]
  const isAssertive = variant === 'error'
  const inlineActions = actionsLayout === 'inline'

  // Bloc texte (titre + message), partagé entre les deux layouts.
  const textBlock = (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      {title ? <span className={cn('text-[14px] font-semibold', style.title)}>{title}</span> : null}
      <span className="text-[13px] text-text-sec">{message}</span>
      {/* Actions empilées (défaut) : sous le message. */}
      {actions && !inlineActions ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )

  return (
    <div
      // error = assertif (annoncé immédiatement) ; autres = poli.
      role={isAssertive ? 'alert' : 'status'}
      aria-live={isAssertive ? 'assertive' : 'polite'}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3',
        style.container,
        className
      )}
    >
      {/* Chip d'icône 32×32, fond teinté de la variante, glyphe centré. */}
      <span
        className={cn(
          'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm',
          style.chip
        )}
        aria-hidden="true"
      >
        <Icon name={icon ?? style.icon} size={20} className={style.iconColor} aria-hidden="true" />
      </span>

      {/* Layout inline : message + actions sur une même ligne, espacés (justify-between).
          Layout stacked : les actions vivent dans le bloc texte. */}
      {actions && inlineActions ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
          {textBlock}
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        </div>
      ) : (
        textBlock
      )}

      {dismissible ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissAriaLabel}
          className="-mr-1 -mt-1 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-ter outline-none hover:text-text focus-visible:shadow-[var(--sh-glow)]"
        >
          <Icon name="X" size={20} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
