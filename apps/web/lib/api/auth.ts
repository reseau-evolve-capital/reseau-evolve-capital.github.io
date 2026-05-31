/**
 * Client API — authentification
 * Toute communication avec /api/auth/* passe par ce module.
 */

/**
 * Envoie une demande de lien magique à l'adresse email donnée.
 * Lève une `Error` avec le message FR de l'API en cas d'échec.
 */
export async function requestMagicLink(email: string): Promise<void> {
  const res = await fetch('/api/auth/magic-link', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Une erreur est survenue. Réessaie.')
  }
}
