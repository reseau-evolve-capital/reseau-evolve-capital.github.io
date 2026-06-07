'use client'
import * as React from 'react'
import { cn } from '../../lib/cn'

export interface LocaleOption {
  /** Code de locale, ex. `fr`, `en`. */
  value: string
  /** Libellé court affiché, ex. `FR`, `EN`. */
  label: string
}

export interface LocaleSwitcherProps {
  /** Locales disponibles (≥ 2). */
  locales: readonly LocaleOption[]
  /** Locale active. */
  current: string
  /** Appelé avec la locale choisie (l'app pose le cookie + rafraîchit). */
  onSelect: (value: string) => void
  /** `aria-label` du groupe. Défaut FR : « Changer de langue ». */
  ariaLabel?: string
  className?: string
}

/**
 * Sélecteur de langue — contrôle segmenté présentationnel (AUCUNE dépendance i18n).
 *
 * L'app fournit `locales`, `current` et `onSelect` (qui appelle la Server Action de
 * changement de locale puis `router.refresh()`). Esthétique mono/uppercase alignée sur
 * les labels techniques du shell ; locale active = pastille jaune (token brand-yellow).
 */
export function LocaleSwitcher({
  locales,
  current,
  onSelect,
  ariaLabel = 'Changer de langue',
  className,
}: LocaleSwitcherProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-[10px] border border-border bg-card p-0.5',
        className
      )}
    >
      {locales.map((locale) => {
        const isActive = locale.value === current
        return (
          <button
            key={locale.value}
            type="button"
            onClick={() => onSelect(locale.value)}
            aria-pressed={isActive}
            lang={locale.value}
            className={cn(
              // Toggle compact sur mobile (hauteur réduite), pleine taille ≥ md.
              'inline-flex min-h-[30px] min-w-[34px] items-center justify-center rounded-[8px] px-2 md:min-h-[36px] md:min-w-[36px] md:px-2.5',
              'font-mono text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors duration-[150ms]',
              'focus:outline-none focus-visible:shadow-[var(--sh-glow)]',
              isActive
                ? 'bg-brand-yellow text-accent-ink'
                : 'text-text-ter hover:bg-neutral-100 hover:text-text'
            )}
          >
            {locale.label}
          </button>
        )
      })}
    </div>
  )
}
