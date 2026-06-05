// Configuration Sentry — runtime Edge (middleware, routes en edge runtime).
// Chargée par instrumentation.ts via register() quand NEXT_RUNTIME === 'edge'.
//
// NB : nos route handlers déclarent `runtime = 'nodejs'`, mais le middleware tourne en
// edge — ce fichier garantit la capture sur toutes les surfaces.
//
// NO-OP sans DSN : `enabled` passe à false si NEXT_PUBLIC_SENTRY_DSN est absent.
// Indépendant du helper Edge Function `supabase/functions/sync/sentry.ts` (autre SDK).
// Réf : docs/monitoring/sentry.md, CLAUDE.md (OPS-001).

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  debug: false,
})
