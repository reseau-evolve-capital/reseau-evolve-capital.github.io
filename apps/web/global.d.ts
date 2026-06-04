/**
 * Augmentation de types next-intl (I18N-001) — clés et locale typées.
 *
 * `messages/fr.json` est la source de vérité des clés : `useTranslations`/`getTranslations`
 * n'acceptent que des clés existantes, et `setLocale`/`useLocale` sont typés sur `Locale`.
 */
import type { Locale } from './i18n/config'
import fr from './messages/fr.json'

declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale
    Messages: typeof fr
  }
}
