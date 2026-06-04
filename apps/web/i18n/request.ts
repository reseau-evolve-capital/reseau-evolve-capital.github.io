/**
 * Configuration de requête next-intl (I18N-001) — mode « without i18n routing ».
 *
 * Résout la locale active depuis le cookie `NEXT_LOCALE` (défaut : `fr`) et charge
 * le catalogue de messages correspondant. Lire le cookie rend la route dynamique ;
 * acceptable ici car toutes les routes membres sont déjà dynamiques (auth Supabase).
 */
import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { defaultLocale, isLocale, LOCALE_COOKIE } from './config'

export default getRequestConfig(async () => {
  const store = await cookies()
  const cookieLocale = store.get(LOCALE_COOKIE)?.value
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
