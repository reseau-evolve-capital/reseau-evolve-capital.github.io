'use client'

// Molecule Toast (NTF-006) — carte de notification éphémère.
//
// Anatomie (réf « Feedback System ») : carte bg-card, BORDURE GAUCHE colorée selon la
// variante, icône + titre (semibold) + message court optionnel + action optionnelle
// (bouton texte) + bouton fermer (X). Animation fade + translateY, désactivée si
// prefers-reduced-motion.
//
// Règles CLAUDE.md : tokens pour les états (succès=data-positive, erreur=data-negative,
// warning=data-warning/strong) ; info = accent brand.yellow (l'accent légitime, ≠ rouge brand
// qui reste INTERDIT pour un état). Zéro hex en dur. error = role="alert"/assertive ; autres
// = role="status". Bouton fermer + action ≥ 44px de cible, focus visible (--sh-glow).
//
// Anatomie raffinée (réf « Feedback System ») :
//   - icône « chipée » : glyphe centré dans un chip 32×32 à fond teinté de la variante,
//   - barre de compte à rebours en bas qui anime scaleX 1→0 sur la durée du toast (sauf
//     error = persistant), masquée sous prefers-reduced-motion,
//   - action en police display, UPPERCASE, couleur de la variante.
//
// Présentationnel pur : la logique de pile/timers vit dans ToastProvider.

import * as React from 'react'

import { Icon, type IconName } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastProps {
  variant: ToastVariant
  title: string
  message?: string
  action?: ToastAction
  /** Callback du bouton fermer. */
  onDismiss: () => void
  /**
   * Durée (ms) avant auto-dismiss, alimentée par le provider. Pilote la barre de compte à
   * rebours. `null`/`undefined` = persistant → pas de barre (cas error). Présentationnel
   * uniquement : le Toast ne déclenche AUCUN timer, c'est le provider qui ferme.
   */
  durationMs?: number | null
  /** aria-label du bouton fermer. Défaut FR. */
  dismissAriaLabel?: string
  /** Libellé visuellement caché si la cible tactile mérite un contexte (non utilisé par défaut). */
  className?: string
}

interface ToastVariantStyle {
  icon: IconName
  /** Bordure gauche colorée. */
  border: string
  /** Couleur de l'icône. */
  iconColor: string
  /** Fond teinté du chip d'icône. */
  chip: string
  /** Couleur de l'action (texte) + de la barre de compte à rebours. */
  accent: string
  /** Fond de la barre de compte à rebours (même teinte que l'accent). */
  bar: string
}

// Mapping variante → tokens. lucide v0.474 : CircleCheck/CircleAlert/TriangleAlert/Info.
// info → accent brand.yellow (surface jaune translucide ~16%). Les états dataviz utilisent
// leur tint -50 pour le chip et leur couleur pleine pour icône/bordure/barre.
const VARIANT_STYLES: Record<ToastVariant, ToastVariantStyle> = {
  success: {
    icon: 'CircleCheck',
    border: 'border-l-data-positive',
    iconColor: 'text-data-positive',
    chip: 'bg-data-positive-50',
    accent: 'text-data-positive',
    bar: 'bg-data-positive',
  },
  error: {
    icon: 'CircleAlert',
    border: 'border-l-data-negative',
    iconColor: 'text-data-negative',
    chip: 'bg-data-negative-50',
    accent: 'text-data-negative',
    bar: 'bg-data-negative',
  },
  info: {
    icon: 'Info',
    border: 'border-l-brand-yellow',
    iconColor: 'text-brand-yellow',
    chip: 'bg-brand-yellow/16',
    accent: 'text-brand-yellow',
    bar: 'bg-brand-yellow',
  },
  warning: {
    icon: 'TriangleAlert',
    border: 'border-l-data-warning',
    iconColor: 'text-data-warning',
    chip: 'bg-data-warning-50',
    accent: 'text-data-warning-strong',
    bar: 'bg-data-warning',
  },
}

// Keyframe de la barre de compte à rebours (scaleX 1→0). Injectée une seule fois côté client ;
// inerte en jsdom. Nom stable → les navigateurs dédupent les déclarations identiques.
const COUNTDOWN_KEYFRAMES = `@keyframes ec-toast-countdown{from{transform:scaleX(1)}to{transform:scaleX(0)}}`

export function Toast({
  variant,
  title,
  message,
  action,
  onDismiss,
  durationMs,
  dismissAriaLabel = 'Fermer la notification',
  className,
}: ToastProps) {
  const style = VARIANT_STYLES[variant]
  const isAssertive = variant === 'error'
  // Barre de compte à rebours : seulement si une durée finie est fournie (jamais pour error).
  const hasCountdown = typeof durationMs === 'number' && durationMs > 0

  return (
    <div
      role={isAssertive ? 'alert' : 'status'}
      aria-live={isAssertive ? 'assertive' : 'polite'}
      className={cn(
        // Carte + bordure gauche colorée. motion-safe : l'entrée (fade + translateY)
        // n'apparaît que si prefers-reduced-motion n'est pas activé (même convention que TrendBadge).
        // relative + overflow-hidden : confine la barre de compte à rebours au coin bas.
        'pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-md border border-l-4 border-border bg-card px-4 py-3 shadow-pop',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-[200ms]',
        style.border,
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
        <Icon name={style.icon} size={20} className={style.iconColor} aria-hidden="true" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[14px] font-semibold text-text">{title}</span>
        {message ? <span className="text-[13px] text-text-sec">{message}</span> : null}
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className={cn(
              'mt-1 inline-flex min-h-[44px] cursor-pointer items-center self-start rounded-md font-display text-[12px] font-bold uppercase tracking-[0.06em] outline-none hover:underline focus-visible:shadow-[var(--sh-glow)]',
              style.accent
            )}
          >
            {action.label}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissAriaLabel}
        className="-mr-1 -mt-1 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-ter outline-none hover:text-text focus-visible:shadow-[var(--sh-glow)]"
      >
        <Icon name="X" size={20} aria-hidden="true" />
      </button>

      {/* Barre de compte à rebours auto-dismiss. Absente pour error (persistant).
          Sous prefers-reduced-motion : la classe motion-reduce:hidden la masque (pas d'animation). */}
      {hasCountdown ? (
        <>
          <style>{COUNTDOWN_KEYFRAMES}</style>
          <div
            data-testid="toast-countdown"
            aria-hidden="true"
            className={cn(
              'absolute inset-x-0 bottom-0 h-0.5 origin-left motion-reduce:hidden',
              style.bar
            )}
            style={{ animation: `ec-toast-countdown ${durationMs}ms linear forwards` }}
          />
        </>
      ) : null}
    </div>
  )
}
