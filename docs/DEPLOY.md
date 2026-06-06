# DEPLOY.md — Guide de déploiement (Evolve Capital)

Ce dépôt est un **monorepo pnpm + Turborepo** avec **deux applications** et un back **Supabase** :

| Cible            | App                                                   | Hébergement                                      | Domaine                               |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------ | ------------------------------------- |
| Vitrine publique | `apps/vitrine` (Next.js `output: 'export'`, statique) | **GitHub Pages** (workflow `deploy-vitrine.yml`) | `reseauevolvecapital.com` (CNAME)     |
| App membre       | `apps/web` (Next.js 16 SSR)                           | **Vercel** (à configurer)                        | (sous-domaine à définir, ex. `app.…`) |
| Back             | `supabase/` (Postgres + Edge Functions)               | **Supabase** (projet à lier)                     | `https://<ref>.supabase.co`           |

> **Règle d'or (CLAUDE.md) : « La vitrine ne casse jamais. »** Avant tout merge sur `main`, lire la **§1** et exécuter la checklist.

---

## ⚠️ 0. LE point à valider AVANT de merger sur `main` (vitrine)

Le **mécanisme de publication GitHub Pages a changé** entre l'ancien et le nouveau workflow :

|                                 | Ancien (`main`, qui marche aujourd'hui)                                       | Nouveau (`feat/monorepo`)                                                       |
| ------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Workflow                        | `.github/workflows/deploy.yml`                                                | `.github/workflows/deploy-vitrine.yml`                                          |
| Action de publication           | `JamesIves/github-pages-deploy-action` → pousse sur la branche **`gh-pages`** | `actions/upload-pages-artifact` + **`actions/deploy-pages@v4`** (artefact OIDC) |
| **Réglage GitHub Pages requis** | **Source = « Deploy from a branch » (`gh-pages`)**                            | **Source = « GitHub Actions »**                                                 |

👉 **ACTION OBLIGATOIRE** : dans `Settings → Pages → Build and deployment → Source`, basculer sur **« GitHub Actions »** (le repo est aujourd'hui en mode « branche `gh-pages` »). Sans ça, après le merge le workflow se lance mais **échoue** (« GitHub Pages not configured to use GitHub Actions ») → vitrine cassée.

> Le `MIGRATION_PLAN.md` (étape 4) prévoyait `peaceiris/actions-gh-pages` (mode branche, **aucun** changement de réglage). Le workflow implémenté a **divergé** vers `actions/deploy-pages` → d'où ce réglage manuel, non documenté dans le plan. **C'est « le truc à valider ».**

---

## 1. Merge `feat/monorepo` → `main`

`main` = vitrine légacy à la **racine** (Next statique, GitHub Pages). `feat/monorepo` = monorepo (vitrine déplacée dans `apps/vitrine`, + `apps/web`, + 5 packages). Le merge **remplace** les workflows et **déplace** le CNAME.

### Ce que le merge change (déploiement)

- Workflows : `deploy.yml` + `pr-check.yml` (npm, racine) **supprimés** → remplacés par `ci.yml`, `deploy-vitrine.yml`, `lighthouse.yml`.
- `CNAME` racine **supprimé** (il contenait `omniventus.com` — erroné). Le bon CNAME vit dans **`apps/vitrine/CNAME` = `reseauevolvecapital.com`** (recopié dans l'artefact Pages par `deploy-vitrine.yml`).
- `next.config.ts` vitrine : **identique** à celui de `main` (`output:'export'`, `images.unoptimized`, `trailingSlash`) → aucune régression de base path.
- La vitrine est **100 % autonome** (aucune dépendance `@evolve/*`) → un changement de package partagé ne la rebuild pas (sans objet ici).

### Checklist pré-merge (0 régression vitrine)

1. **Basculer Pages Source sur « GitHub Actions »** (cf. §0).
2. **Tester le workflow AVANT le merge** : ajouter temporairement `workflow_dispatch:` (le trigger actuel n'a que `push: main` + path filter `apps/vitrine/**`) au `deploy-vitrine.yml`, le lancer depuis `feat/monorepo`, vérifier le job jusqu'à `Deploy to GitHub Pages` (vert).
3. **Vérifier l'artefact `github-pages`** : il contient `index.html`/`fr/index.html` **ET** `CNAME` = `reseauevolvecapital.com`.
4. **Renseigner les secrets repo** du build vitrine (cf. §5 ; tous ont un fallback → le build ne casse pas sans eux, mais formulaires/analytics inactifs sinon).
5. **Custom domain + HTTPS** : `Settings → Pages → Custom domain = reseauevolvecapital.com`, « Enforce HTTPS » coché.
6. **(Optionnel, prudence)** `.nojekyll` : si un asset sous `_next/` renvoie 404, committer `apps/vitrine/public/.nojekyll`.
7. **Merge** (PR `feat/monorepo` → `main`). Le `ci.yml`/`lighthouse.yml` tournent sur la PR (build `apps/web`, **pas** la vitrine — d'où l'importance du test #2).
8. **Post-merge** : `curl -I https://reseauevolvecapital.com` → `200` + vérif visuelle en navigation privée.

### Rollback (⚠ le plan est périmé)

Le rollback `git checkout gh-pages && reset --hard && push --force` du `MIGRATION_PLAN.md` **ne marche plus** (on ne sert plus depuis `gh-pages`). Options réelles :

- **`git revert`** du commit de merge sur `main` + re-run du workflow ; OU
- **Urgence** : rebasculer `Settings → Pages → Source` sur la branche **`gh-pages`** (elle contient encore le dernier build prod connu) → restaure instantanément l'ancien site le temps de corriger.

---

## 2. Vitrine → GitHub Pages (`apps/vitrine`)

- **Workflow** : `.github/workflows/deploy-vitrine.yml` — déclenché sur `push: main` filtré `apps/vitrine/**`. Build statique (`next build` → `out/`), recopie `CNAME`, upload artefact, `actions/deploy-pages@v4`. Permissions `pages: write` + `id-token: write` + environnement `github-pages`.
- **Polices** : ✅ non concernée par le piège des polices d'`apps/web` — les `.otf` MADE Tommy Soft de la vitrine sont **committées** (`apps/vitrine/public/fonts/`), build webpack classique.
- **Secrets de build** (GitHub repo secrets, tous avec fallback côté code) :
  - `NEXT_PUBLIC_CONTACT_FORM_URL` (formulaire contact → Apps Script)
  - `NEXT_PUBLIC_APP_SCRIPT_URL` (newsletter → Apps Script)
  - `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` (analytics)
  - `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` (présent dans le workflow mais **non référencé** dans le code → legacy à nettoyer)
- **Formulaires** : `contact.ts`/`newsletter.ts` POSTent vers un **Google Apps Script Web App** (`apps/vitrine/Code.gs`, déployé manuellement hors repo). ⚠ Voir §6 (secret en clair).
- **Blog (Strapi)** : `generateStaticParams` fetch Strapi (`NEXT_PUBLIC_STRAPI_*`). En CI Strapi est injoignable → toutes les fonctions sont en `try/catch → []` → **le build ne casse pas** (0 page blog). Pour peupler le blog en prod, fournir `NEXT_PUBLIC_STRAPI_API_URL`/`_TOKEN` au build (non injectés actuellement).

---

## 3. App membre → Vercel (`apps/web`)

> **État actuel : aucun déploiement Vercel n'est configuré** (pas de `vercel.json`, pas de workflow Vercel). Tout est à poser côté Vercel.

### Réglages Vercel recommandés

- **Root Directory** = racine du repo (monorepo). Laisse Vercel détecter pnpm/Turbo.
- **Install** : `pnpm install --frozen-lockfile`.
- **Build** : `pnpm turbo build --filter=@evolve/web` (le `prebuild` d'apps/web exécute `scripts/ensure-fonts.mjs` ; si Vercel appelle `next build` directement, **s'assurer que `ensure-fonts.mjs` tourne AVANT** — sinon Turbopack casse sur les `@font-face url()`).
- **Output** : `apps/web/.next`. **Node** : 20 (`.nvmrc`). SSR classique (pas d'`output: export/standalone`).

### Piège des polices (MADE Tommy Soft) — BLOQUANT si non géré

Les `.otf` sont **gitignorées** (licence, repo public). `scripts/ensure-fonts.mjs` : si `EVOLVE_FONTS_SRC` pointe un dossier contenant les `.otf` → les copie (rendu fidèle) ; sinon **génère des stubs vides** → le build passe, fallback Plus Jakarta Sans au runtime.

- **Vercel** : fournir les `.otf` (stockées hors git) via `EVOLVE_FONTS_SRC`, OU accepter le fallback. Vérifier que le script s'exécute avant `next build`.

### Variables Vercel (cf. matrice §5)

- **Obligatoires** : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (= URL prod de l'app).
- **Recommandées** : `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`/`SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`.
- **Build (source-maps Sentry)** : `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (sinon upload skippé, build OK).
- **Optionnelles** : `SUPABASE_SERVICE_ROLE_KEY` (**server-only**, requise seulement pour les invitations ADM-007 côté route serveur), `UPSTASH_REDIS_REST_URL`/`_TOKEN` (rate-limit, sinon fail-open), price providers (`GOOGLE_APPS_SCRIPT_URL`/`_SECRET`, `GOOGLE_SHEETS_PRICE_SHEET_ID`, `ALPHA_VANTAGE_KEY` — sinon fallback snapshot DB).

---

## 4. Supabase (prod)

1. **Lier le projet** : `supabase link --project-ref <ref>`.
2. **Migrations** : `supabase db push` (applique `001 → 031`). ⚠ Vérifier que TOUTES sont poussées (en local, 018-031 étaient appliquées hors-remote pendant le dev). Notamment : 013/021 (pg_cron), 020/022/023 (attestations), 027 (update email), **029/030 (portfolio_aggregates + member_quote_part en VUE)**, 031 (invitations restreintes).
3. **Edge Functions** : `supabase functions deploy sync send-email on-user-first-login send-monthly-attestations` (`send-email` avec `--no-verify-jwt`).
4. **Secrets Edge** (`supabase secrets set …`) : `GOOGLE_SA_KEY_BASE64`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `SEND_EMAIL_HOOK_SECRET` (format `v1,whsec_…`), `APP_URL`, optionnel `SENTRY_DSN`. (`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` sont **auto-injectées** par le runtime Edge.)
5. **`config.toml` prod** (décommenter/activer) :
   - `[auth.email.smtp]` → relais **Brevo** (sinon aucun email d'auth ne part).
   - `[auth.hook.send_email]` → uri `https://<ref>.functions.supabase.co/send-email` (emails magic link **brandés + localisés**).
   - `site_url` + `additional_redirect_urls` : remplacer `http://localhost:3001` par le domaine **prod de l'app web** (sinon le magic link redirige mal).
6. **Settings DB cron** (hors migration, à poser via SQL une fois) :
   ```sql
   ALTER DATABASE postgres SET app.sync_url        = 'https://<ref>.supabase.co/functions/v1/sync';
   ALTER DATABASE postgres SET app.attestation_url = 'https://<ref>.supabase.co/functions/v1/send-monthly-attestations';
   ALTER DATABASE postgres SET app.service_role_key = '<service-role-key>';
   ```
   Sans ça, les crons `pg_cron` → `net.http_post` partent avec URL/Authorization vides.
7. **Multi-club** : poser le vrai `clubs.sheet_id` par club **en DB** (jamais d'env `SHEET_ID` en prod) + partager chaque matrice Google en lecture avec le `client_email` du service account.

---

## 5. Matrice des variables d'environnement

> Convention : `NEXT_PUBLIC_*` = exposée au navigateur (non secrète). Le reste = **server-only / secret**. Aucune valeur ici — clés uniquement.

### apps/web (Vercel)

| Variable                                                                                  | Contexte          | Requis       | Notes                                                 |
| ----------------------------------------------------------------------------------------- | ----------------- | ------------ | ----------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                                                | public + build    | ✅           | sert aussi à dériver la CSP (`connect-src`/`img-src`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                                           | public + build    | ✅           | clé anon (RLS appliquée)                              |
| `NEXT_PUBLIC_SITE_URL`                                                                    | public + build    | ✅           | origin pour `emailRedirectTo`/liens invitation        |
| `SUPABASE_SERVICE_ROLE_KEY`                                                               | **server secret** | ⚠ si ADM-007 | **jamais** côté client                                |
| `NEXT_PUBLIC_SENTRY_DSN`                                                                  | public            | reco         | vide = Sentry no-op                                   |
| `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT`                                   | server/public     | opt          | étiquette env                                         |
| `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT`                                     | build secret      | reco         | upload source-maps (sinon skip)                       |
| `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`                                                  | public            | opt          | vide = pas de beacon                                  |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN`                                                       | server secret     | opt          | rate-limit magic link (sinon fail-open)               |
| `GOOGLE_APPS_SCRIPT_URL` / `_SECRET`, `GOOGLE_SHEETS_PRICE_SHEET_ID`, `ALPHA_VANTAGE_KEY` | server            | opt          | price providers (sinon fallback snapshot)             |
| `EVOLVE_FONTS_SRC`                                                                        | build             | opt          | dossier `.otf` (sinon stubs)                          |

### apps/vitrine (GitHub repo secrets)

| Variable                                 | Notes                             |
| ---------------------------------------- | --------------------------------- |
| `NEXT_PUBLIC_CONTACT_FORM_URL`           | Apps Script contact               |
| `NEXT_PUBLIC_APP_SCRIPT_URL`             | Apps Script newsletter            |
| `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` | analytics vitrine                 |
| `NEXT_PUBLIC_GOOGLE_SCRIPT_URL`          | ⚠ non utilisé (legacy à nettoyer) |
| `NEXT_PUBLIC_STRAPI_API_URL` / `_TOKEN`  | blog (opt — sinon 0 page blog)    |

### Edge Functions (Supabase secrets)

`GOOGLE_SA_KEY_BASE64`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `SEND_EMAIL_HOOK_SECRET`, `APP_URL`, `SENTRY_DSN` (opt), `OTP_EXPIRY_SECONDS` (opt). `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` auto-injectées.

### GitHub Actions (repo → Settings → Secrets and variables → Actions)

| Workflow                         | Secrets utilisés                                                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml` (build apps/web sur PR) | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (sinon build vert sans source-maps)                                                 |
| `deploy-vitrine.yml`             | `NEXT_PUBLIC_CONTACT_FORM_URL`, `NEXT_PUBLIC_APP_SCRIPT_URL`, `NEXT_PUBLIC_GOOGLE_SCRIPT_URL`, `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` |
| `lighthouse.yml`                 | aucun (placeholders)                                                                                                                    |

### Cron (paramètres de session Postgres — pas des env vars)

`app.sync_url`, `app.attestation_url`, `app.service_role_key` → cf. §4.6.

---

## 6. 🔒 Sécurité — actions URGENTES (repo PUBLIC)

> ⚠️ Le merge sur `main` n'aggrave pas ces points (déjà dans la vitrine légacy), mais ils sont **exposés sur un repo public** et doivent être traités.

1. **Secrets Strapi en clair** : `apps/vitrine/content/.env` contient des secrets COMPLETS (`APP_KEYS`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, `DATABASE_*`, `SUPABASE_API_KEY`) committés. → **Révoquer/rotater ces secrets + sortir le fichier du repo (gitignore)** en priorité.
2. **Secret formulaire en dur** : `apps/vitrine/Code.gs` valide un secret partagé **en clair** → compromis. → Le déplacer dans le **Properties Service** de l'Apps Script + rotater.
3. **`SUPABASE_SERVICE_ROLE_KEY`** : confirmé **jamais** exposée côté client (lue uniquement en server/Edge/scripts). Ne jamais la préfixer `NEXT_PUBLIC_`.

---

## 7. Validation post-déploiement

- **Vitrine** : `curl -I https://reseauevolvecapital.com` → 200 ; pages clés OK ; formulaire contact + newsletter envoient ; analytics actif.
- **App web** : login magic link (email brandé reçu via Brevo, lien-only) → 1er clic → dashboard non vide ; sync (trésorier) → toast + données ; attestation PDF ; light/dark + fr/en.
- **Supabase** : `supabase db push` clean ; Edge functions répondent ; crons planifiés (sync ~2h, attestation mensuelle) ; `clubs.sheet_id` posé + matrice partagée au service account.
- **Observabilité** : Sentry reçoit les events (DSN + CSP `*.sentry.io`) ; Cloudflare analytics actif.

---

### Annexe — workflows actuels (`feat/monorepo`)

- `ci.yml` : lint + typecheck + test + build `apps/web` (PR vers `main`). Gate qualité.
- `deploy-vitrine.yml` : déploie la vitrine sur Pages (push `main`, path `apps/vitrine/**`).
- `lighthouse.yml` : Lighthouse CI sur pages publiques d'`apps/web` (non bloquant vitrine).
