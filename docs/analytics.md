# Analytics — Google Analytics 4 (UBA)

> Statut : `apps/web` est passé **full GA4** (OPS-006). **Cloudflare Web Analytics a été retiré** du flux app (composant `Analytics.tsx` supprimé, CSP et env nettoyés). La doc détaillée GA4 vit dans `docs/analytics/` (cahier des charges UBA, plan de taggage, brief dev, spec bannière de consentement).

## Provider

**Google Analytics 4** (mesure UBA). Le flux app est instrumenté via `gtag.js`, chargé par `apps/web/components/analytics/GoogleAnalytics.tsx` :

- Stub `gtag` + **Consent Mode v2** (default `denied`) injecté **synchroniquement** dans le `<head>` (avant `gtag.js`), puis `gtag.js` en `afterInteractive`.
- Measurement ID via `NEXT_PUBLIC_GA_ID_APP` (variable publique, pas un secret).
- **ID absent → le composant rend `null`** : aucun script GA n'est injecté. No-op sûr en dev/CI/build.
- Monté dans `apps/web/app/layout.tsx`, dans le `<head>`.

## Ce qui est tracké

- **Pageviews automatiques** (gtag config).
- **Events métier** via `apps/web/lib/analytics.ts` (`trackEvent()` → `window.gtag('event', …)`) + `user_id` pseudonyme consent-gated. Voir `docs/analytics/PLAN-DE-TAGGAGE.md`.

## RGPD / vie privée

GA4 est **consent-gated** (Consent Mode v2, default denied). La bannière de consentement RGPD (`ConsentMount`) tranche le choix utilisateur ; avant consentement, gtag n'émet que des pings cookieless. `anonymize_ip: true`. Cf. `docs/analytics/BANNIERE-CONSENTEMENT-SPEC.md`.

## Accès au dashboard

Console **Google Analytics 4** → propriété de l'app (`NEXT_PUBLIC_GA_ID_APP`).

## Fichiers

- `apps/web/components/analytics/GoogleAnalytics.tsx` — chargement gtag + Consent Mode v2 (rend null sans ID).
- `apps/web/components/consent/ConsentMount.tsx` — bannière de consentement.
- `apps/web/lib/analytics.ts` — helper `trackEvent` (GA4, no-op sans gtag) + events.
- `apps/web/app/layout.tsx` — montage `<GoogleAnalytics />` dans le `<head>`.
- `apps/web/.env.example` — `NEXT_PUBLIC_GA_ID_APP`.
