// Alerte Sentry best-effort. Déclenchée quand une sync accumule >= 2 erreurs.
// Implémentation minimale via l'API Store de Sentry (pas de SDK Node).
// Toute défaillance est avalée : l'alerting ne doit jamais faire échouer la sync.

/** Parse un DSN Sentry en { storeUrl, authHeader }. null si DSN absent/malformé. */
function parseDsn(dsn: string): { storeUrl: string; publicKey: string } | null {
  try {
    const url = new URL(dsn)
    const publicKey = url.username
    const projectId = url.pathname.replace(/^\//, '')
    if (!publicKey || !projectId) return null
    const storeUrl = `${url.protocol}//${url.host}/api/${projectId}/store/`
    return { storeUrl, publicKey }
  } catch {
    return null
  }
}

/**
 * Envoie un événement Sentry décrivant les erreurs de sync. Best-effort : swallow.
 * Ne fait rien si SENTRY_DSN n'est pas configuré.
 */
export async function alertSentry(
  dsn: string | undefined,
  context: { club_id: string; errors: string[]; sheets: string[] }
): Promise<void> {
  if (!dsn) return
  const parsed = parseDsn(dsn)
  if (!parsed) return
  try {
    const event = {
      message: `Sync Sheets en échec partiel pour le club ${context.club_id} (${context.errors.length} erreurs)`,
      level: 'error',
      platform: 'other',
      timestamp: Date.now() / 1000,
      extra: context,
      tags: { club_id: context.club_id, source: 'edge-function:sync' },
    }
    await fetch(parsed.storeUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-sentry-auth': `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=evolve-sync/1.0`,
      },
      body: JSON.stringify(event),
    })
  } catch {
    // Alerting best-effort : on n'interrompt jamais la sync à cause de Sentry.
  }
}
