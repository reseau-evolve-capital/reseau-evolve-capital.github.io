/**
 * Configuration i18n de l'app membre (I18N-001).
 *
 * Stratégie : next-intl « without i18n routing ». La locale ne vit PAS dans l'URL
 * (l'app est 100 % authentifiée → aucun enjeu SEO) mais dans un cookie `NEXT_LOCALE`.
 * Français par défaut ; ajouter une langue = ajouter `messages/<locale>.json` ici.
 */

export const locales = ['fr', 'en'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'fr'

/** Nom du cookie de locale (convention next-intl). */
export const LOCALE_COOKIE = 'NEXT_LOCALE'

/** Garde de type : vrai si `value` est une locale supportée. */
export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (locales as readonly string[]).includes(value)
}
