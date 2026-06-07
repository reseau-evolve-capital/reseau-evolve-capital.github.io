import type { UrlInterne } from '@evolve/types'

/**
 * Helpers partagés par les renderers email des blocs éditoriaux (EDI-005).
 *
 * Source de vérité : `docs/editorial/block-contract.md`. Tout est rendu en mode
 * CLAIR baked (les emails ne portent pas de variante sombre — cf. EvolveEmailShell).
 */

/** Espace membre (dashboard quote-part) — prod. Cf. block-contract.md §résolution urlInterne. */
export const APP_URL = 'https://app.reseauevolvecapital.com'

/** Base vitrine publique — résout `/blog` et `/#contact`. */
export const VITRINE_URL = 'https://reseauevolvecapital.com'

/**
 * Résout l'URL d'un bloc CTA : `url` explicite prioritaire, sinon mappe `urlInterne`.
 * Renvoie `null` si aucune cible exploitable (le renderer s'abstient alors).
 */
export function resolveCtaHref(
  url: string | null | undefined,
  urlInterne: UrlInterne | null | undefined
): string | null {
  const explicit = (url ?? '').trim()
  if (explicit !== '') return explicit
  switch (urlInterne) {
    case 'quote-part':
    case 'espace-membre':
      return APP_URL
    case 'blog':
      return `${VITRINE_URL}/blog`
    case 'contact':
      return `${VITRINE_URL}/#contact`
    default:
      return null
  }
}

/** `true` si une valeur de chaîne optionnelle est réellement présente (non vide). */
export function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim() !== ''
}
