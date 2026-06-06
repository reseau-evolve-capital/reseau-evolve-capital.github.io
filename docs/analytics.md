# Analytics — Cloudflare Web Analytics (OPS-002)

> Statut : livré sur `feat/monorepo` pour `apps/web`. La vitrine (`apps/vitrine`) utilise déjà le même provider.

## Provider

**Cloudflare Web Analytics** (offre gratuite). On a **abandonné Umami** (backlog périmé) au profit de Cloudflare, déjà en place sur la vitrine — un seul provider, une seule console.

Le beacon est chargé côté client par `apps/web/components/Analytics.tsx` :

- `<Script>` (next/script, `strategy="afterInteractive"`, `defer`) qui injecte `https://static.cloudflareinsights.com/beacon.min.js` avec l'attribut `data-cf-beacon='{"token":"…"}'`.
- Token via `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` (variable publique, pas un secret).
- **Token absent → le composant rend `null`** : aucun beacon n'est injecté. No-op sûr en dev/CI (et au build, qui n'a pas le token).
- Monté dans `apps/web/app/layout.tsx`, dans le `<body>`, après le provider i18n.

## Ce qui est tracké

- **Pageviews automatiques** — captées par le beacon sans configuration.
- **Navigations SPA** — l'App Router fait du client-side routing ; le beacon Cloudflare détecte les changements d'URL et compte les vues correspondantes.

Aucune instrumentation manuelle n'est nécessaire pour les pageviews.

## ⚠ Limite honnête : pas d'events custom

Cloudflare Web Analytics (gratuit) **ne fournit PAS d'API d'events custom**. Le beacon ne définit pas `window.cfAnalytics`.

`apps/web/lib/analytics.ts` expose un helper `trackEvent()` + un objet `analyticsEvents` (parité d'API avec la vitrine), mais comme la garde `window.cfAnalytics` est toujours fausse, **`trackEvent()` est un no-op**. Les 4 events métier candidats du backlog Umami historique — `portfolio_view`, `sync_manual_trigger`, `pdf_download`, `magic_link_sent` — **ne sont donc PAS remontés**.

Adopter un provider à events (PostHog, Plausible events, etc.) est une **décision produit V1**, hors scope OPS-002. Le helper est en place pour ne pas réécrire les call sites le jour où on bascule.

## RGPD / vie privée

Cloudflare Web Analytics est **sans cookie** : le beacon ne pose **aucun cookie** et n'utilise pas de stockage local pour le suivi. L'IP est **anonymisée** côté Cloudflare et n'est pas exposée. Aucune empreinte cross-site, aucun identifiant persistant.

Conséquence : **pas de bandeau de consentement requis** (pas de traceur au sens ePrivacy / CNIL). À confirmer avec le responsable de traitement, mais l'offre est conçue comme privacy-first.

## Accès au dashboard

Console Cloudflare → **Analytics & Logs → Web Analytics** → site correspondant au token. Le token associe le beacon au site déclaré côté Cloudflare ; les vues remontent dans cette vue (visiteurs, pages vues, top pages, referrers, pays, Core Web Vitals).

## À faire pour OPS-004 (CSP)

La future Content Security Policy devra **allowlister** les domaines Cloudflare, sinon le beacon est bloqué :

- `script-src` → `https://static.cloudflareinsights.com` (chargement de `beacon.min.js`)
- `connect-src` → `https://cloudflareinsights.com` (endpoint d'ingestion des vues)

## Fichiers

- `apps/web/components/Analytics.tsx` — composant client (beacon, rend null sans token).
- `apps/web/lib/analytics.ts` — helper `trackEvent` (no-op safe) + `analyticsEvents`.
- `apps/web/app/layout.tsx` — montage dans le `<body>`.
- `apps/web/.env.example` — `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`.
