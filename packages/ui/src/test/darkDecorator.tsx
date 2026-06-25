import * as React from 'react'
import type { Decorator } from '@storybook/react'

/**
 * Décorateur de story « thème sombre ».
 *
 * Pose `data-theme="dark"` sur <html> (et le restaure au démontage). C'est le SEUL
 * mécanisme fiable pour basculer les tokens en sombre dans Storybook : les variables
 * `@theme` de Tailwind v4 (`--color-*: var(--token)`) sont résolues au niveau `:root`,
 * donc un wrapper `data-theme="dark"` imbriqué NE bascule PAS les couleurs mappées
 * (ex. `bg-card-sub`, `text-data-dividend-fg`). Le paramètre `parameters.globals`
 * n'est pas non plus appliqué à l'iframe statique seule. Voir piège §8 de la spec E-OPS-2.
 */
export const withDarkTheme: Decorator = (Story) => {
  React.useLayoutEffect(() => {
    const el = document.documentElement
    const prev = el.getAttribute('data-theme')
    el.setAttribute('data-theme', 'dark')
    return () => {
      if (prev) el.setAttribute('data-theme', prev)
      else el.removeAttribute('data-theme')
    }
  }, [])
  return (
    <div style={{ background: 'var(--bg)', padding: 24 }}>
      <Story />
    </div>
  )
}
