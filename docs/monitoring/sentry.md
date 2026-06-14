# Monitoring — Sentry (OPS-001)

Intégration de [`@sentry/nextjs`](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
(v10) dans `apps/web` pour la capture d'erreurs serveur et client.

> **État au moment de l'intégration** : aucun projet Sentry n'existe encore. Le code est
> prêt, branché et documenté avec des **placeholders**. Tant que `NEXT_PUBLIC_SENTRY_DSN`
> est vide, **Sentry est désactivé (no-op)** — voir ci-dessous.

## NO-OP sans DSN (critère bloquant)

Sentry **ne casse jamais le build ni le runtime** quand le DSN est absent :

- Les quatre `Sentry.init({ ... })` reçoivent `enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN)`.
  Sans DSN → `enabled: false` → le SDK n'ouvre aucun transport, n'envoie aucun événement.
- `Sentry.captureException(...)` dans les routes reste appelable mais est un no-op tant que
  le SDK n'est pas initialisé.
- `withSentryConfig` n'**uploade** les source maps que si `SENTRY_AUTH_TOKEN` est présent.
  Absent (dev + build CI sans secret) → skip silencieux, build OK.

Ce comportement couvre le cas dev (pas de `.env.local` Sentry) **et** le cas build CI avec
env placeholder (cf. `.github/workflows/ci.yml`, job `build`).

## Fichiers

| Fichier                     | Rôle                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `instrumentation.ts`        | `register()` charge la config selon `NEXT_RUNTIME` ; export `onRequestError`.            |
| `instrumentation-client.ts` | Init client (navigateur) + `onRouterTransitionStart`.                                    |
| `sentry.server.config.ts`   | Init runtime Node.js (RSC, route handlers).                                              |
| `sentry.edge.config.ts`     | Init runtime Edge (middleware).                                                          |
| `next.config.ts`            | `withSentryConfig(withNextIntl(nextConfig), …)` — options de build + upload source maps. |

`tracesSampleRate: 0.1` (10 %) — raisonnable en V0.

## Variables d'environnement

Voir `apps/web/.env.example`. Résumé :

| Variable                                                | Portée           | Rôle                                                     |
| ------------------------------------------------------- | ---------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN`                                | client+server    | DSN d'ingestion (public). **Vide = Sentry désactivé.**   |
| `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | server / client  | Environnement remonté (production, preview…). Optionnel. |
| `SENTRY_AUTH_TOKEN`                                     | server-only (CI) | Upload source maps au build. Absent → pas d'upload.      |
| `SENTRY_ORG`, `SENTRY_PROJECT`                          | server-only (CI) | Cible de l'upload.                                       |

Le DSN est **public par nature** (préfixe `NEXT_PUBLIC_`) : c'est une clé d'ingestion, pas
un secret. `SENTRY_AUTH_TOKEN` en revanche est un **secret** (server-only, jamais shippé au
client) — défini uniquement comme secret GitHub Actions.

## Helper centralisé (apps/web)

`apps/web/lib/monitoring/sentry.ts` expose 3 fonctions typées :

| Fonction                         | Contexte d'appel       | Champs obligatoires |
| -------------------------------- | ---------------------- | ------------------- |
| `captureRouteError(error, ctx)`  | Route handlers (catch) | `endpoint: string`  |
| `captureActionError(error, ctx)` | Server Actions         | `action: string`    |
| `captureClientError(error, ctx)` | React Query onError    | `source: string`    |

Toutes délèguent à `Sentry.captureException` — no-op sans DSN garanti par le SDK.
Pas de guard `if (dsn)` dans le helper : c'est le SDK qui court-circuite via `enabled: false`.

Tests unitaires : `apps/web/lib/monitoring/sentry.test.ts` (17 tests, Vitest).

## Captures & tags

### Routes API

| Route                        | Tags                                 | Contexte (non nominatif)        | Helper                    |
| ---------------------------- | ------------------------------------ | ------------------------------- | ------------------------- |
| `/api/admin/club-summary`    | `endpoint`                           | `userId`, `club_id`             | `captureRouteError`       |
| `/api/admin/contributions`   | `endpoint`                           | `userId`, `club_id`             | `captureRouteError`       |
| `/api/admin/invitations`     | `endpoint`                           | `userId`, `club_id`             | `captureRouteError`       |
| `/api/admin/members`         | `endpoint`                           | `userId`, `club_id`             | `captureRouteError`       |
| `/api/attestation/detention` | `endpoint`                           | `user.id`, `club_id`, `period`  | `Sentry.captureException` |
| `/api/auth/handoff-link`     | `endpoint`                           | `userId`                        | `captureRouteError`       |
| `/api/auth/magic-link`       | `endpoint`, `step`                   | `email_domain` (domaine seul)   | `Sentry.captureException` |
| `/api/contributions`         | `endpoint`                           | `userId`, `club_id`             | `captureRouteError`       |
| `/api/dashboard`             | `endpoint`                           | `userId`, `club_id`             | `captureRouteError`       |
| `/api/health`                | `endpoint`                           | —                               | `captureRouteError`       |
| `/api/market-prices`         | `endpoint`                           | `symbols[]`                     | `captureRouteError`       |
| `/api/newsletter/preview`    | `endpoint`                           | `slug`                          | `captureRouteError`       |
| `/api/newsletter/send-test`  | `endpoint`                           | —                               | `captureRouteError`       |
| `/api/newsletter/send`       | `endpoint`, `step`                   | —                               | `captureRouteError`       |
| `/api/onboarding/profile`    | `endpoint`                           | `userId`                        | `Sentry.captureException` |
| `/api/portfolio`             | `endpoint`                           | `userId`, `club_id`             | `captureRouteError`       |
| `/api/sync`                  | `endpoint`, `role` + partial failure | `userId`, `club_id`, `errors[]` | mixte                     |

### Error boundaries

| Composant          | Type                  | Mécanisme                                                 |
| ------------------ | --------------------- | --------------------------------------------------------- |
| `global-error.tsx` | Root boundary         | `Sentry.captureException(error)` dans `useEffect`         |
| 10 × `error.tsx`   | Boundaries segmentées | `<RouteErrorReporter error={error} routeSegment="..." />` |

### React Query & Server Actions

| Couche                              | Couverture                                                       |
| ----------------------------------- | ---------------------------------------------------------------- |
| React Query `QueryCache.onError`    | Toutes les queries (sauf 401) → `captureClientError`             |
| React Query `MutationCache.onError` | Toutes les mutations → `captureClientError`                      |
| `admin/actions.ts` (7 actions)      | Erreurs PG inconnues (`captureIfUnknown`) → `captureActionError` |
| `feedback/actions.ts`               | Erreur INSERT Supabase inattendue → `captureActionError`         |
| `acces-suspendu/actions.ts`         | Erreur `signOut()` → `captureActionError`                        |

### Données personnelles — pas d'email en clair

La route magic-link manipule l'email du membre. **On n'envoie jamais l'adresse complète à
Sentry** : seul le **domaine** (`emailDomain()`, partie après `@`) est remonté en `extra`,
suffisant pour diagnostiquer un souci SMTP/DNS sans exposer la partie locale (RGPD).

Les routes `sync`, `attestation` et les Server Actions remontent `user.id` (UUID Supabase,
non nominatif) + `club_id`, pas de nom/email.

## Couverture effective (post-Phase-8)

| Couche                         | Avant       | Après                                      |
| ------------------------------ | ----------- | ------------------------------------------ |
| Routes API                     | 3/17 (18 %) | 17/17 (100 %)                              |
| Error boundaries               | 0/11 (0 %)  | 11/11 (100 %)                              |
| React Query                    | 0 %         | global onError actif                       |
| Server Actions                 | 0 %         | 3 fichiers, erreurs inconnues capturees    |
| RSC pages                      | 0 %         | 2 pages (dashboard chart + newsletter CMS) |
| Edge Functions                 | 1/5 (20 %)  | 5/5 (100 %)                                |
| **Couverture globale estimee** | **~20 %**   | **>= 75 %**                                |

## Edge Functions

| Fonction                    | Couverture                                                               |
| --------------------------- | ------------------------------------------------------------------------ |
| `sync`                      | `alertSentry` si `errors.length >= 1` (seuil abaisse de 2 vers 1)        |
| `send-email`                | `alertSentry` avant throw sur BREVO_API_KEY manquante + echec HTTP Brevo |
| `feedback-dispatch`         | `alertSentry` dans le catch final                                        |
| `send-monthly-attestations` | `alertSentry` dans le catch final                                        |
| `on-user-first-login`       | `alertSentry` avant throw sur BREVO_API_KEY manquante + echec HTTP Brevo |

## Coexistence avec le helper Edge Function

`supabase/functions/sync/sentry.ts` reste **indépendant** : l'Edge Function `sync` (Deno)
ne peut pas utiliser `@sentry/nextjs` (SDK Node/navigateur) ; elle garde son helper
`alertSentry()` minimal (POST best-effort sur l'API Store de Sentry). Les deux peuvent
pointer vers le **même projet Sentry** (même DSN) et se distinguent par le tag `source` /
`endpoint`. Ne pas fusionner les deux : surfaces d'exécution différentes.

## Actions owner

1. Créer un projet Sentry (plateforme « Next.js »).
2. Récupérer le **DSN** → définir `NEXT_PUBLIC_SENTRY_DSN` dans l'env Vercel (preview + prod).
3. Créer un **auth token** (scope `project:releases`) → secret GitHub `SENTRY_AUTH_TOKEN`,
   - secrets `SENTRY_ORG` et `SENTRY_PROJECT`, pour l'upload des source maps en CI.
4. (Optionnel) définir `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` par env.

## Tester

Une fois le DSN défini en local (`apps/web/.env.local`) :

1. Ajouter un `throw new Error('test sentry')` temporaire dans un route handler (ou une page).
2. `pnpm --filter @evolve/web dev`, déclencher la route.
3. Vérifier l'apparition de l'événement dans le projet Sentry.
4. **Retirer le `throw`.**

Sans DSN, le même `throw` est géré normalement par Next.js — aucun envoi, aucune erreur SDK.
