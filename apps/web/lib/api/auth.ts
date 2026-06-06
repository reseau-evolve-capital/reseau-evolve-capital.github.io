/**
 * Client API — authentification
 * Toute communication avec /api/auth/* passe par ce module.
 *
 * Ce module n'est pas un composant React : il ne peut pas appeler `useTranslations`.
 * Le message d'erreur de repli (quand l'API ne renvoie aucun message localisé) est
 * donc surchargeable par l'appelant (composant `'use client'`) via `fallbackError`,
 * qui passe `t('errors.nav.requestFailed')`. Le défaut FR reste byte-exact pour que
 * le rendu soit strictement identique tant que l'appelant ne câble rien.
 */

/** Message FR de repli si l'API ne renvoie aucun message localisé. */
const DEFAULT_FALLBACK_ERROR = 'Une erreur est survenue. Réessaie.'

/**
 * Envoie une demande de lien magique à l'adresse email donnée.
 * Lève une `Error` avec le message FR de l'API en cas d'échec ; à défaut de
 * message renvoyé par l'API, utilise `fallbackError` (i18n) ou le défaut FR.
 */
export async function requestMagicLink(
  email: string,
  fallbackError: string = DEFAULT_FALLBACK_ERROR
): Promise<void> {
  const res = await fetch('/api/auth/magic-link', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? fallbackError)
  }
}
