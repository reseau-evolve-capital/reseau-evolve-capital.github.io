'use client'
import * as React from 'react'
import { Icon } from '../Icon'
import { cn } from '../../lib/cn'

export type Theme = 'light' | 'dark'

/** Clé de persistance du thème dans localStorage. */
const STORAGE_KEY = 'ec-theme'

export interface ThemeToggleProps {
  className?: string
}

/**
 * Bouton de bascule clair / sombre.
 *
 * Le thème est piloté par l'attribut `data-theme` sur `<html>` :
 * clair = pas d'attribut (ou `"light"`), sombre = `data-theme="dark"`.
 * L'état est persisté dans `localStorage` sous la clé `ec-theme`.
 *
 * Pour éviter tout mismatch d'hydratation (un script no-flash externe applique
 * déjà `data-theme` avant peinture), on rend un placeholder stable jusqu'au
 * montage, puis on lit l'état réel depuis le DOM dans un `useEffect`.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const [mounted, setMounted] = React.useState(false)
  const [isDark, setIsDark] = React.useState(false)

  // Au montage seulement : lit l'état réel posé sur <html> par le script no-flash.
  React.useEffect(() => {
    setIsDark(document.documentElement.dataset['theme'] === 'dark')
    setMounted(true)
  }, [])

  const toggle = React.useCallback(() => {
    setIsDark((prev) => {
      const next = !prev
      const root = document.documentElement
      if (next) {
        root.dataset['theme'] = 'dark'
      } else {
        // Clair = absence d'attribut (cohérent avec :root par défaut).
        delete root.dataset['theme']
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
      } catch {
        // localStorage indisponible (mode privé, quota) : on ignore silencieusement.
      }
      return next
    })
  }, [])

  const baseClassName = cn(
    'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px]',
    'text-text-sec transition-colors duration-[150ms] hover:bg-neutral-100 hover:text-text',
    'focus:outline-none focus-visible:shadow-[var(--sh-glow)]',
    className
  )

  // Placeholder stable avant montage : même balise/dimensions, icône neutre.
  if (!mounted) {
    return (
      <button type="button" aria-label="Basculer le thème" className={baseClassName} disabled>
        <Icon name="SunMoon" size={20} aria-hidden="true" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
      className={baseClassName}
    >
      <Icon name={isDark ? 'Sun' : 'Moon'} size={20} aria-hidden="true" />
    </button>
  )
}
