# Brief développeur — implémentation UBA / GA4 + consentement

> Instructions exécutables. Lire d'abord le **[Cahier des charges](./CAHIER-DES-CHARGES-UBA.md)**, le **[Plan de taggage](./PLAN-DE-TAGGAGE.md)** et la **[Spec bannière](./BANNIERE-CONSENTEMENT-SPEC.md)**.
> **Mode orchestrateur** (`CLAUDE.md`) : décomposer, paralléliser l'indépendant, sérialiser les fichiers partagés (`layout.tsx`, barrels, `.env.example`, `turbo.json`), gate vert + vérif runtime light/dark + parité fr/en avant commit. **Commits FR atomiques par ticket. Push sur demande uniquement.**

## Prérequis owner (bloquants)

1. **Créer le 2ᵉ flux GA4** (même propriété que `G-LP0PW78BQ5`, domaine app) → fournir le nouveau `G-XXXX`.
2. Confirmer le **domaine de prod de l'app** (cross-domain + flux app).
3. **Autoriser les modifs vitrine** (ajout additif GA4 + bannière) — `CLAUDE.md` exige la confirmation avant de toucher les fichiers de prod de la vitrine.

## Variables d'environnement (à déclarer)

```
NEXT_PUBLIC_GA_ID_VITRINE            = G-LP0PW78BQ5
NEXT_PUBLIC_GA_ID_APP                = G-XXXX                 # nouveau flux
NEXT_PUBLIC_CONSENT_BANNER_VARIANT   = compact | bar          # défaut compact
NEXT_PUBLIC_CONSENT_BANNER_SIDE      = gauche | droite        # défaut gauche
```

À câbler : `.env.example`, `.env.local`, `turbo.json` (`globalEnv`), `.github/workflows/deploy-vitrine.yml` (build vitrine, comme l'actuel `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`), Vercel (preview + prod, app). **Garde no-op** : pas d'ID → GA ne charge pas (comme `components/Analytics.tsx` rend `null` sans token aujourd'hui) → pas de pollution en dev/CI/e2e.

---

## Phase 1 — Socle GA4 + consentement (touche la vitrine → confirmation requise)

### 1.1 Tag GA4 + Consent Mode v2

- App : `@next/third-parties/google` `GoogleAnalytics` **OU** `<Script>` gtag, monté dans `apps/web/app/layout.tsx` (à côté du `<Analytics/>` Cloudflare existant — coexistence OK le temps de la transition).
- **Inline `<head>` avant GA** : `gtag('consent','default',{ analytics_storage:'denied', ad_*:'denied', region:['FR','EU'…] })` (cf. [spec §5](./BANNIERE-CONSENTEMENT-SPEC.md)). Idem vitrine dans `apps/vitrine/src/app/[locale]/layout.tsx` (où vit déjà `<Analytics/>`).
- Module partagé `consent-mode` (vanilla, sans React) : `getConsent()`, `setConsent(choice)`, `applyConsent()` (appelle `gtag('consent','update',…)`), lecture/écriture cookie 1ʳᵉ partie ≤ 6 mois.

### 1.2 Bannière (les deux variantes + switch env + défaut compact-gauche)

- `packages/ui` : composant présentationnel `ConsentBanner` (copy via props) + stories (variante × thème × état). Compose `Button`/`Switch`/`Dialog` existants. Réutiliser les tokens exacts de la [spec §3](./BANNIERE-CONSENTEMENT-SPEC.md).
- `apps/web/components` : wrapper qui lit l'env (`VARIANT`/`SIDE`), injecte les traductions (`messages/*`), branche `consent-mode`, monte la bannière dans `layout.tsx`.
- **Vitrine** : composant autonome équivalent (hors `@evolve/ui`), mêmes tokens + même module `consent-mode`. Copy via `{fr,en}`.
- **Gate fidélité ≥ 97 %** via agent `qa-visual` en boucle (cf. [spec §6](./BANNIERE-CONSENTEMENT-SPEC.md)) — light + dark, variante défaut + `bar`.

### 1.3 Recâblage des helpers existants

- Réécrire le corps de `trackEvent()` dans `apps/web/lib/analytics.ts` **et** `apps/vitrine/src/lib/analytics.ts` → `window.gtag('event', name, params)` (signature typée conservée ; abandonner la forme UA `category/action/label`). Ne **rien** émettre tant que `analytics_storage !== 'granted'`.
- Mettre à jour / archiver `docs/analytics.md` (Cloudflare « pas de bandeau » → caduc).

**Gate P1 :** `make lint typecheck test` vert · stories `@evolve/ui` · `cursor-pointer.spec.ts` 0 échec · **runtime light & dark** · bannière fidélité ≥ 97 % · pas de cookie `_ga` avant consentement (DebugView/Tag Assistant) · parité fr/en.

---

## Phase 2 — Key events + funnels

- Émettre les **6 key events** (cf. [plan §3](./PLAN-DE-TAGGAGE.md)) : `contact_form_submit`, `newsletter_signup`, `login_completed`, `onboarding_completed`, `portfolio_viewed`, `attestation_download`. Les marquer **key events** dans GA4.
- `user_id` (UUID Supabase **haché**) + `user_properties` posés après `login_completed`, **uniquement si consenti**.
- Câbler les funnels : activation app, acquisition vitrine, newsletter, blog→conversion, pont vitrine→app.
- Enregistrer les custom dimensions/user-properties prioritaires dans l'admin GA4.

**Gate P2 :** events visibles en **DebugView** avec params bucketisés conformes · **zéro PII** (checklist [plan §5](./PLAN-DE-TAGGAGE.md)) · funnels peuplés.

---

## Phase 3 — Couverture complète + proxies de friction

- Reste du catalogue (vitrine + app + admin + transverse).
- Listeners **globaux** `rapid_repeat_click` / `dead_click` / `error_encountered` / `nav_loop` (1 app authentifié, 1 vitrine) — échantillonnés + plafonnés par session.
- `web_vitals` via lib `web-vitals` (vitrine ; LCP/CLS/INP) ; `page_not_found`.
- Lier **Search Console ↔ GA4** (flux vitrine) ; `noindex` confirmé sur l'app.

**Gate P3 :** quota custom definitions non dépassé · proxies n'explosent pas le volume (vérif échantillonnage) · runtime OK.

---

## Phase 4 — Avancé (optionnel, documenté)

- **Export BigQuery EU** (lien gratuit GA4→BQ, dataset région `EU`) + export Supabase **pseudonymisé** (`user_id` haché, `club_id_hash`, `*_bucket`) → jointures usage × valeur **sans € dans GA** (cf. [cahier §5](./CAHIER-DES-CHARGES-UBA.md)).
- `<MicroSurvey>` (`packages/ui`) + table Supabase `ux_survey_responses` (RLS staff) + widget feedback.
- Pont **Brevo → GA4** (Measurement Protocol côté serveur) pour `attestation_email_opened/clicked` (NTF-005).

---

## Config GA4 (admin console — owner + dev)

- 2 flux (vitrine `G-LP0PW78BQ5` ; app nouveau ID), **cross-domain ON** (lister les 2 domaines sur chaque flux).
- **Exclusions de référents** : `*.supabase.co` (retour magic-link), domaine de tracking Brevo, `script.google.com` (forms vitrine).
- **Filtre trafic interne** (IP équipe) ; rétention **14 mois** ; **Google Signals OFF** ; data location **EU** si proposé à la création ; export **BigQuery ON**.
- `/verifier/[ref]` → flux app avec `app_surface=public_verify` (ne pas polluer le `user_id`) + redaction de la `ref`.

## Rattachement aux gates `CLAUDE.md`

- Ajouter au **gate « fait »** : « events GA4 spécifiés émettent réellement (preuve DebugView) + zéro PII » — comme on exige déjà rendu light/dark + parité fr/en.
- Logger les arbitrages dans `docs/audits/design-reference-map.md` ou ici.
- **Push uniquement sur demande.**
