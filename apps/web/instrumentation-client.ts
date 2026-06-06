// Configuration Sentry — runtime navigateur (client). Chargée automatiquement par Next.js
// (fichier instrumentation-client racine de l'app, pattern @sentry/nextjs v9+).
//
// NO-OP sans DSN : `enabled` passe à false si NEXT_PUBLIC_SENTRY_DSN est absent → aucun
// SDK actif côté client, aucun impact runtime. Le DSN est PUBLIC par nature (préfixe
// NEXT_PUBLIC_), c'est une clé d'ingestion, pas un secret.
// Réf : docs/monitoring/sentry.md, CLAUDE.md (OPS-001).

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  debug: false,
})

// Requis par @sentry/nextjs pour instrumenter les transitions de navigation App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
