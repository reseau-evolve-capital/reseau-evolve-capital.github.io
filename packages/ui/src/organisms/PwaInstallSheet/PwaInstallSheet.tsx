'use client'

// PwaInstallSheet (PWA-001) — bottom sheet « installer l'app ».
//
// Bannière non-intrusive ancrée en bas du viewport, paramétrée par case
// (android-chrome / ios-safari / ios-other). Un SEUL composant : le copy et le
// CTA changent par props, le dispatch par case vit dans apps/web (cf. spec §2.C).
//
// Anatomie (réf visuelle « PWA Install Banners (standalone) », Row 01) :
//  - poignée (grab handle) centrée en haut
//  - en-tête : pastille « € » + « Evolve Capital » + badge (sous-ligne mono,
//    aria-hidden) + bouton dismiss X (hit-target 44×44, glyphe 24)
//  - headline <h2> + subline <p>
//  - CTA pleine largeur (h48, --accent/--accent-ink, --r-md)
//  - dismiss fantôme « Plus tard »
//
// PRÉSENTATIONNEL STRICT : props uniquement, zéro window / i18n / data. Tout le
// copy arrive par props (les stories fournissent des exemples). Tokens uniquement,
// jamais de hex en dur. role="dialog" aria-modal="false" (non-modal : ne piège pas
// le focus, l'app reste utilisable derrière).
//
// Animation : entrée slide-up 320ms --ease-dec / sortie slide-down 220ms ease-std ;
// si reducedMotion (ou prefers-reduced-motion) → simple fondu 150ms.
// Réf : SuspendedScreen (pastille €, tokens), Button (spinner, focus glow), CLAUDE.md.

import * as React from 'react'

import { cn } from '../../lib/cn'

export type PwaInstallSheetCtaState = 'default' | 'loading' | 'disabled'

export interface PwaInstallSheetProps {
  /** Visibilité contrôlée. À false, le composant joue la sortie puis se démonte. */
  open: boolean
  /** Titre principal (ex. « Garde-la sous la main. »). */
  headline: string
  /** Sous-titre explicatif. */
  subline: string
  /** Badge sous le wordmark (ex. « Web app · sans App Store »). aria-hidden. */
  badge: string
  /** Libellé du CTA primaire (« Installer » | « Voir comment » | « Continuer dans Safari »). */
  ctaLabel: string
  /** Libellé + aria-label du dismiss (« Plus tard »). */
  dismissLabel: string
  /** État du CTA : default | loading (spinner, largeur conservée) | disabled. */
  ctaState?: PwaInstallSheetCtaState
  /** Clic sur le CTA primaire. */
  onCta: () => void
  /** Clic sur le X ou sur « Plus tard ». */
  onDismiss: () => void
  /** aria-label du bouton fermer (X). Défaut = dismissLabel. */
  closeLabel?: string
  /** Override testable du reduced-motion ; sinon prefers-reduced-motion via CSS. */
  reducedMotion?: boolean
  /** Focus auto du CTA à l'ouverture (géré par le mount). Défaut false. */
  autoFocus?: boolean
  className?: string
}

/** Pastille « € » (carré arrondi sombre, glyphe accent). Décorative. */
function EuroPastille() {
  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-accent text-[18px] font-bold text-accent-ink"
      aria-hidden="true"
    >
      €
    </span>
  )
}

/** Spinner inline (largeur du bouton conservée pendant le loading). */
function CtaSpinner() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="h-5 w-5 animate-spin motion-reduce:animate-none"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function PwaInstallSheet({
  open,
  headline,
  subline,
  badge,
  ctaLabel,
  dismissLabel,
  ctaState = 'default',
  onCta,
  onDismiss,
  closeLabel,
  reducedMotion = false,
  autoFocus = false,
  className,
}: PwaInstallSheetProps) {
  const headlineId = React.useId()
  const ctaRef = React.useRef<HTMLButtonElement>(null)

  // On monte le composant tant qu'il est ouvert OU en cours de sortie.
  const [mounted, setMounted] = React.useState(open)
  // entered pilote la transform : false = hors écran (bas), true = en place.
  const [entered, setEntered] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setMounted(true)
      // Double rAF : garantit que l'état initial (translateY 100%) est peint
      // avant de basculer vers entered, sinon pas de transition d'entrée.
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
      return () => cancelAnimationFrame(id)
    }
    setEntered(false)
    // Démonte après la durée de sortie (la transition CSS gère le visuel).
    const t = setTimeout(() => setMounted(false), reducedMotion ? 150 : 220)
    return () => clearTimeout(t)
  }, [open, reducedMotion])

  // Focus auto du CTA à l'ouverture (optionnel ; le mount décide quand l'activer).
  React.useEffect(() => {
    if (open && entered && autoFocus) ctaRef.current?.focus()
  }, [open, entered, autoFocus])

  if (!mounted) return null

  const isLoading = ctaState === 'loading'
  const isDisabled = ctaState === 'disabled'

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={headlineId}
      data-state={entered ? 'open' : 'closed'}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[480px]',
        'rounded-t-[14px] border-t border-border bg-card shadow-[var(--sh-pop)]',
        'px-4 pt-4 pb-[max(32px,env(safe-area-inset-bottom))]',
        // Transition : transform (slide) + opacity. reduced-motion → opacity seule.
        reducedMotion
          ? 'transition-opacity duration-[150ms]'
          : cn(
              'will-change-transform',
              entered
                ? 'transition-[transform,opacity] duration-[320ms] ease-[var(--ease-dec)]'
                : 'transition-[transform,opacity] duration-[220ms] ease-[var(--ease-std)]'
            ),
        // motion-reduce (CSS prefers-reduced-motion) neutralise toute transform.
        'motion-reduce:transition-opacity motion-reduce:duration-[150ms]',
        entered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
        'motion-reduce:translate-y-0',
        className
      )}
    >
      {/* Poignée décorative (grab handle). */}
      <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border-strong" aria-hidden="true" />

      {/* En-tête : wordmark + badge à gauche, dismiss X à droite. */}
      <div className="flex items-start gap-3">
        <EuroPastille />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-bold leading-tight text-text">
            Evolve Capital
          </p>
          <p
            className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-text-ter"
            aria-hidden="true"
          >
            {badge}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={closeLabel ?? dismissLabel}
          className={cn(
            '-mr-1 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md',
            'text-text-ter transition-colors duration-[150ms] hover:bg-card-sub hover:text-text-sec',
            'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]'
          )}
        >
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Corps : headline + subline. */}
      <h2
        id={headlineId}
        className="mt-4 font-display text-[18px] font-bold leading-snug text-text"
      >
        {headline}
      </h2>
      <p className="mt-1.5 text-[14px] font-medium leading-relaxed text-text-sec">{subline}</p>

      {/* CTA primaire pleine largeur. */}
      <button
        ref={ctaRef}
        type="button"
        onClick={onCta}
        disabled={isDisabled || isLoading}
        aria-busy={isLoading || undefined}
        aria-disabled={isDisabled || isLoading || undefined}
        className={cn(
          'mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--r-md)]',
          'bg-accent text-[15px] font-semibold text-accent-ink',
          'transition-all duration-[150ms] hover:opacity-90',
          'active:scale-[0.99] motion-reduce:active:scale-100',
          'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]',
          'disabled:cursor-not-allowed',
          isDisabled && 'opacity-40'
        )}
      >
        {isLoading ? (
          <>
            <CtaSpinner />
            {/* Conserve la largeur du libellé pendant le chargement. */}
            <span className="sr-only">{ctaLabel}</span>
            <span aria-hidden="true" className="invisible">
              {ctaLabel}
            </span>
          </>
        ) : (
          ctaLabel
        )}
      </button>

      {/* Dismiss fantôme « Plus tard ». */}
      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          'mt-2 inline-flex h-11 w-full items-center justify-center rounded-md',
          'text-[14px] font-medium text-text-sec',
          'transition-colors duration-[150ms] hover:text-text',
          'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]'
        )}
      >
        {dismissLabel}
      </button>
    </div>
  )
}
