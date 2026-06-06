'use server'

/**
 * Server Action de changement de langue (I18N-001).
 *
 * Pose le cookie `NEXT_LOCALE` ; la locale est ensuite relue par `i18n/request.ts`
 * au prochain rendu serveur. Le composant client appelant doit `router.refresh()`
 * après l'appel pour re-rendre l'arbre avec le nouveau catalogue.
 */
import { cookies } from 'next/headers'
import { isLocale, LOCALE_COOKIE, type Locale } from '@/i18n/config'

export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return
  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 an
    sameSite: 'lax',
  })
}
