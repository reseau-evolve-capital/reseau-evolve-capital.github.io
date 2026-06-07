/**
 * Enregistrement du service worker (PWA-001) — strictement gardé et crash-safe.
 *
 * Conditions : navigateur, support SW, contexte sécurisé (https/localhost), prod uniquement
 * (en dev le SW interfère avec le HMR Turbopack). Aucun échec n'est propagé à l'app.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  if (process.env.NODE_ENV !== 'production') return
  if (!window.isSecureContext) return
  try {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* enregistrement échoué : l'app fonctionne sans SW, on n'alerte pas l'utilisateur */
    })
  } catch {
    /* never throw to the app */
  }
}

/**
 * Demande au service worker de purger le cache de données (appelé au logout pour ne pas
 * laisser de données financières en cache sur l'appareil). No-op si pas de SW actif.
 */
export function clearPwaDataCaches(): void {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.controller?.postMessage('clear-data-cache')
  } catch {
    /* noop */
  }
}
