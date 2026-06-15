'use client'
import * as React from 'react'
import { cn } from '../../lib/cn'

export interface SegmentedToggleOption {
  value: string
  label: string
  /** Caché < md (affiché ≥ md). Pour les options secondaires sur mobile. */
  mobileHidden?: boolean
}

export interface SegmentedToggleProps {
  options: SegmentedToggleOption[]
  /** Valeur active (option dont `value` correspond → pill `bg-accent`). */
  value: string
  onChange: (value: string) => void
  /** Nom accessible du groupe (i18n côté appelant — ZÉRO copy par défaut ici). */
  ariaLabel: string
  className?: string
}

/**
 * Bascule segmentée générique (pill) — pattern de référence : le toggle de période de la
 * carte « Évolution » du dashboard. Présentationnel, ZÉRO i18n : `options.label` et `ariaLabel`
 * sont injectés. Tokens design-system uniquement (aucun hex, aucun `cursor` en dur → la règle
 * globale `@layer base` couvre `<button>`).
 *
 * a11y : `role="group"` nommé, chaque option est un `<button aria-pressed>` (focus glow,
 * navigation clavier native). La pill visuelle fait ~28px ; la cible tactile est étendue à
 * ≥44px via le pseudo-élément `before:` (sans casser la mise en page).
 */
export function SegmentedToggle({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedToggleProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'flex shrink-0 items-center gap-[2px] rounded-full border border-border p-[2px]',
        className
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            // Pill ~28px visuel ; le pseudo-élément étend la cible tactile à ≥44px.
            'relative isolate inline-flex h-7 items-center rounded-full px-2.5',
            'font-display text-[10px] font-semibold uppercase tracking-[0.08em]',
            "before:absolute before:left-0 before:right-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-['']",
            'outline-none focus-visible:shadow-[var(--sh-glow)]',
            'motion-safe:transition-colors motion-safe:duration-[var(--dur-fast)]',
            o.value === value ? 'bg-accent text-accent-ink' : 'bg-transparent text-text-sec',
            o.mobileHidden && 'hidden md:inline-flex'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
