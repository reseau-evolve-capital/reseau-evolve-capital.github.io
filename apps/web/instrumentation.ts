// Instrumentation Next.js (App Router) — point d'entrée serveur du monitoring.
// register() est appelée une fois au démarrage de chaque runtime serveur ; on charge la
// config Sentry correspondant au runtime courant.
//
// onRequestError relaie les erreurs serveur non capturées (RSC, route handlers) à Sentry.
// Sans DSN, les init() sont no-op → captureRequestError ne fait rien.
// Réf : docs/monitoring/sentry.md, CLAUDE.md (OPS-001).

import * as Sentry from '@sentry/nextjs'

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
