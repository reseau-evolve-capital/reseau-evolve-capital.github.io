// Configuration Sentry — runtime serveur Node.js (RSC, route handlers, server actions).
// Chargée par instrumentation.ts via register() quand NEXT_RUNTIME === 'nodejs'.
//
// NO-OP sans DSN : si NEXT_PUBLIC_SENTRY_DSN est absent (dev + build CI placeholder),
// `enabled` passe à false et le SDK n'envoie rien — le runtime ne casse jamais.
// Réf : docs/monitoring/sentry.md, CLAUDE.md (OPS-001).

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  // Sans DSN → Sentry est désactivé proprement (aucun envoi réseau, aucune erreur).
  enabled: Boolean(dsn),
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  // Échantillonnage des traces de performance : 10 % suffit en V0.
  tracesSampleRate: 0.1,
  // Logger interne du SDK désactivé hors debug pour ne pas polluer les logs serveur.
  debug: false,
})
