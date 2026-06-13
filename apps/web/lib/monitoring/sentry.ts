/**
 * Helper centralisé Sentry pour apps/web.
 *
 * Règles RGPD :
 *  - Seul user.id (UUID) est transmis — jamais d'email ni de PII.
 *  - Pas de guard `if (dsn)` : le SDK est déjà no-op sans DSN via `enabled: Boolean(dsn)`.
 */

import * as Sentry from '@sentry/nextjs'

// ---------------------------------------------------------------------------
// Types de contexte
// ---------------------------------------------------------------------------

export interface RouteErrorContext {
  endpoint: string
  userId?: string
  extra?: Record<string, unknown>
}

export interface ActionErrorContext {
  action: string
  userId?: string
  extra?: Record<string, unknown>
}

export interface ClientErrorContext {
  source: string
  queryKey?: readonly unknown[]
  extra?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Capture une erreur depuis un route handler Next.js (server-side).
 *
 * @example
 * captureRouteError(error, { endpoint: '/api/sync', userId: user.id, extra: { club_id } })
 */
export function captureRouteError(error: unknown, ctx: RouteErrorContext): void {
  Sentry.captureException(error, {
    tags: { endpoint: ctx.endpoint },
    ...(ctx.userId ? { user: { id: ctx.userId } } : {}),
    extra: ctx.extra,
  })
}

/**
 * Capture une erreur depuis une Server Action Next.js (server-side).
 *
 * @example
 * captureActionError(error, { action: 'updateProfile', userId: user.id })
 */
export function captureActionError(error: unknown, ctx: ActionErrorContext): void {
  Sentry.captureException(error, {
    tags: { action: ctx.action },
    ...(ctx.userId ? { user: { id: ctx.userId } } : {}),
    extra: ctx.extra,
  })
}

/**
 * Capture une erreur côté client (React Query `onError`, error boundaries…).
 *
 * @example
 * captureClientError(error, { source: 'usePortfolio', queryKey: ['portfolio', clubId] })
 */
export function captureClientError(error: unknown, ctx: ClientErrorContext): void {
  Sentry.captureException(error, {
    tags: { source: ctx.source },
    extra: {
      ...(ctx.queryKey !== undefined ? { queryKey: ctx.queryKey } : {}),
      ...ctx.extra,
    },
  })
}
