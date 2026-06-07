import type { UrlInterne } from '@/lib/api'

/**
 * URL de l'espace membre (dashboard quote-part). Surchargée via env si besoin.
 * Cf. docs/editorial/block-contract.md §Résolution urlInterne.
 */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.reseauevolvecapital.com'

/**
 * Résout l'URL d'un CTA éditorial : `url` explicite prioritaire, sinon mappe
 * `urlInterne` selon la table du contrat de blocs. Les liens internes vitrine
 * sont préfixés par la locale courante. Retourne `null` si rien n'est résolvable.
 */
export function resolveCtaUrl(
  url: string | null | undefined,
  urlInterne: UrlInterne | null | undefined,
  locale: string
): string | null {
  if (url) return url
  switch (urlInterne) {
    case 'quote-part':
    case 'espace-membre':
      return APP_URL
    case 'blog':
      return `/${locale}/blog`
    case 'contact':
      return `/${locale}#contact`
    default:
      return null
  }
}

/** Vrai si l'URL pointe hors de la vitrine (cible/rel à ajouter). */
export function isExternalUrl(href: string): boolean {
  return /^https?:\/\//i.test(href)
}
