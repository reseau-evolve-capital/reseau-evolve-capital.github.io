# DEPLOY.md — Guide de déploiement (Evolve Capital)

Monorepo **pnpm + Turborepo**, deux applications + back **Supabase** :

| Cible            | App                                                   | Hébergement                                                             | Domaine                               |
| ---------------- | ----------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| Vitrine publique | `apps/vitrine` (Next.js `output: 'export'`, statique) | **GitHub Pages** — branche **`gh-pages`**, **déploiement MANUEL local** | `reseauevolvecapital.com` (CNAME)     |
| App membre       | `apps/web` (Next.js 16 SSR)                           | **Vercel** (à configurer)                                               | (sous-domaine à définir, ex. `app.…`) |
| Back             | `supabase/` (Postgres + Edge Functions)               | **Supabase** (projet à lier)                                            | `https://<ref>.supabase.co`           |

> **Règle d'or (CLAUDE.md) : « La vitrine ne casse jamais. »** Détail vitrine faisant autorité : **`apps/vitrine/CLAUDE.md`**.

---

## ⚠️ 0. À SAVOIR sur le déploiement vitrine (le « truc à valider »)

Le déploiement de la vitrine **n'est PAS automatisé** et **ne passe PAS par GitHub Actions** :

- **Déploiement = MANUEL, en local** : `make vitrine-export` (build statique avec **Strapi local démarré**) → `make vitrine-deploy` (`gh-pages -d out -t` → pousse `out/` sur la **branche `gh-pages`**).
- **GitHub Pages doit rester réglé sur _« Deploy from a branch : `gh-pages` »_.** ❗ **NE PAS** basculer sur « GitHub Actions ».
- Le workflow `.github/workflows/deploy-vitrine.yml` est **DORMANT à dessein** (`on: workflow_dispatch:` uniquement). Il builderait **sans Strapi → blog VIDE**. À garder dormant **tant que Strapi n'est pas hébergé à distance** (cf. Roadmap §2).

> Ces deux modes (branche `gh-pages` MANUEL vs « GitHub Actions ») sont **mutuellement exclusifs** : choisir l'un, pas les deux. Le mode actif et validé est **branche `gh-pages` / manuel**.

**Pourquoi le build exige Strapi** : le blog est généré en SSG (`generateStaticParams` → API Strapi). Si Strapi ne tourne pas, les `try/catch` de `src/lib/api.ts` renvoient `[]` et **le blog se build vide, sans erreur**. → Toujours démarrer Strapi avant `make vitrine-export`.

---

## 1. Merge `feat/monorepo` → `main`

`main` = vitrine légacy à la racine. `feat/monorepo` = monorepo (vitrine dans `apps/vitrine` + `apps/web` + 5 packages + Supabase).

### ✅ Impact sur la vitrine live : AUCUN (le merge est sûr)

La vitrine live est servie depuis la **branche `gh-pages`** (Pages = « branch »). Le merge modifie **`main`**, **PAS `gh-pages`** → **le site public reste servi à l'identique pendant et après le merge.** De plus le workflow est dormant (`workflow_dispatch`) → **aucun auto-deploy** déclenché par le merge.

> En clair : tu peux merger sans crainte pour le site public. La vitrine ne se redéploie QUE quand tu lances `make vitrine-deploy` à la main.

### Ce que le merge change côté repo (déploiement)

- Workflows : `deploy.yml` + `pr-check.yml` (npm, racine) **supprimés** → remplacés par `ci.yml` (gate qualité apps/web), `deploy-vitrine.yml` (dormant), `lighthouse.yml`.
- `CNAME` racine **supprimé** (il contenait `omniventus.com` — erroné) ; le bon vit dans `apps/vitrine/CNAME` = `reseauevolvecapital.com` (recopié dans `out/` par `make vitrine-export`).
- `next.config.ts` vitrine : **identique** à `main` (`output:'export'`, `images.unoptimized`, `trailingSlash`).
- La vitrine reste **100 % autonome** (aucune dépendance `@evolve/*`).

### Checklist merge (vitrine)

1. **Ne PAS toucher** au réglage GitHub Pages : il reste **« Deploy from a branch : `gh-pages` »**.
2. **Laisser `deploy-vitrine.yml` dormant** (`on: workflow_dispatch:`) — ne pas réactiver de trigger `push`.
3. Merger `feat/monorepo` → `main` (PR). `ci.yml`/`lighthouse.yml` tournent sur la PR (build/qualité **apps/web**, pas la vitrine).
4. **Après merge** : vérifier que le **déploiement manuel fonctionne depuis la nouvelle arbo** — `make strapi-db-up && make strapi-dev` (Strapi up), `make vitrine-export` (vérifier que `out/` contient le blog peuplé + `CNAME` + `.nojekyll`), puis `make vitrine-deploy`. Enfin `curl -I https://reseauevolvecapital.com` → 200.
5. Le site public n'ayant pas bougé pendant le merge, il n'y a **rien à restaurer** — au pire on ne redéploie pas tant que le manuel n'est pas re-validé.

### Rollback

- La branche `gh-pages` est la **source vivante** : tant qu'on ne la repousse pas, l'ancien site reste servi. Un mauvais `make vitrine-deploy` se corrige en redéployant un bon `out/` (ou via l'historique de `gh-pages`).
- Côté `main` : `git revert` du commit de merge si nécessaire (sans effet sur le site public, qui dépend de `gh-pages`).

> ⚠ Le rollback du `MIGRATION_PLAN.md` (étape 11) est **périmé/inexact** vis-à-vis de ce flux manuel — se référer à cette section.

---

## 2. Vitrine → GitHub Pages (`apps/vitrine`) — pipeline réel

> Doc complète : **`apps/vitrine/CLAUDE.md`**. **On ne refactore JAMAIS la vitrine** (modifs chirurgicales, confirmer avant toute action destructive sur `content/`, `Code.gs`, etc.).

### Pipeline blog (SSG depuis Strapi LOCAL)

```
[Strapi 5 local :1337]  ── DB ──▶ Postgres LOCAL (Docker, conteneur strapiDB :5433)
 (content/, yarn,        ── assets ─▶ disque (provider "local" → content/public/uploads)
  Node 22 LTS)
        ▲ @strapi/client (src/lib/strapi.ts + api.ts)
[next build vitrine] ── generateStaticParams ──▶ pages blog statiques ──▶ out/ ──▶ branche gh-pages
```

- **Supabase distant MORT** (pause > 90 j, non restaurable). La DB Strapi a été **migrée en Postgres local** (conteneur `strapiDB`, port **5433**, base `strapi`) restaurée d'un dump cluster. Les **assets/images sont PERDUS** (Storage mort) → enregistrements `files` en 404 ; **provider d'upload désormais `local`**.
- ⚠ **Images en prod** : provider local → les médias ne sont servis que sur `localhost:1337` → **absents du site statique déployé**. Pour des images publiques : recâbler un provider de storage public (S3/Cloudinary/nouveau bucket) dans `content/config/plugins.ts` + re-uploader. **Follow-up avant de redéployer un blog avec images.**
- **Permissions Strapi** : le rôle **Public** doit avoir `find`/`findOne` sur article/category/author/tag (sinon 403 → blog vide). (Ré)accordées automatiquement au démarrage par `content/src/index.ts` (bootstrap idempotent) → **redémarrer Strapi après un restore**.
- `content/` est en **yarn classic** (hors pnpm-workspace) ; son `package.json` épingle `packageManager: yarn@1.22.22` (corepack) — **ne pas retirer**. Node **22 LTS** requis (`content/.nvmrc`).

### Commandes

```bash
# 1. Postgres local Strapi
make strapi-db-up
# 2. Strapi (bascule Node 22 via nvm) → admin http://localhost:1337/admin
make strapi-dev
#    (restaurer un dump si besoin : make strapi-db-restore BACKUP=db_cluster-….backup.gz)
# 3. Build + export statique (génère out/ + .nojekyll + CNAME) — Strapi DOIT tourner
make vitrine-export
# 4. Publier sur la branche gh-pages
make vitrine-deploy
```

### Formulaires (contact / newsletter)

POSTent vers un **Google Apps Script Web App** (`apps/vitrine/Code.gs`, déployé manuellement hors repo). Secrets de build (GitHub repo secrets, fallback côté code) : `NEXT_PUBLIC_CONTACT_FORM_URL`, `NEXT_PUBLIC_APP_SCRIPT_URL`, `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`. (`NEXT_PUBLIC_GOOGLE_SCRIPT_URL` présent mais non référencé → legacy à nettoyer.) ⚠ Voir §6 (secret en clair).

> **Note** : ces secrets ne servent qu'en **build local** (le deploy étant manuel). Le bloc `with: env:` du `deploy-vitrine.yml` dormant ne sert que si on réactive le workflow.

### Roadmap : Strapi distant

Héberger Strapi sur un serveur distant → le build CI **et** `deploy-vitrine.yml` redeviennent viables (pointer `NEXT_PUBLIC_STRAPI_API_URL` sur l'instance distante + réactiver le trigger + basculer Pages sur « GitHub Actions »). `content/docker-compose.prod.yml` est le point de départ self-host (à réconcilier).

---

## 3. App membre → Vercel (`apps/web`)

> **État actuel : aucun déploiement Vercel n'est configuré** (pas de `vercel.json`, pas de workflow). Tout est à poser côté Vercel. Indépendant de la vitrine.

### Réglages Vercel recommandés

- **Root Directory** = racine du repo (monorepo). **Install** : `pnpm install --frozen-lockfile`. **Node** : 20 (`.nvmrc`).
- **Build** : `pnpm turbo build --filter=@evolve/web`. Le `prebuild` d'`apps/web` exécute `scripts/ensure-fonts.mjs` ; si Vercel appelle `next build` directement, **s'assurer que `ensure-fonts.mjs` tourne AVANT** (sinon Turbopack casse sur les `@font-face url()`). **Output** : `apps/web/.next` (SSR, pas d'export/standalone).

### Piège des polices (MADE Tommy Soft) — BLOQUANT si non géré

Les `.otf` sont **gitignorées** (licence, repo public). `scripts/ensure-fonts.mjs` : si `EVOLVE_FONTS_SRC` pointe un dossier avec les `.otf` → copie (rendu fidèle) ; sinon **stubs vides** → build OK, fallback Plus Jakarta Sans. **Vercel** : fournir les `.otf` via `EVOLVE_FONTS_SRC` (hors git), ou accepter le fallback.

### Variables (cf. matrice §5)

Obligatoires : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`. Recommandées : `NEXT_PUBLIC_SENTRY_DSN`, `(NEXT_PUBLIC_)SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`. Build Sentry : `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT`. Optionnelles : `SUPABASE_SERVICE_ROLE_KEY` (**server-only**, invitations ADM-007), `UPSTASH_REDIS_REST_URL`/`_TOKEN`, price providers, `EVOLVE_FONTS_SRC`.

---

## 4. Supabase (prod)

1. `supabase link --project-ref <ref>`.
2. **Migrations** : `supabase db push` (`001 → 031`). ⚠ Vérifier que TOUTES sont poussées (018-031 étaient appliquées hors-remote en dev). Notamment 013/021 (pg_cron), 020/022/023 (attestations), 027 (email), **029/030 (portfolio_aggregates + member_quote_part en VUE)**, 031 (invitations).
3. **Edge Functions** : `supabase functions deploy sync send-email on-user-first-login send-monthly-attestations` (`send-email` avec `--no-verify-jwt`).
4. **Secrets Edge** (`supabase secrets set`) : `GOOGLE_SA_KEY_BASE64`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `SEND_EMAIL_HOOK_SECRET` (`v1,whsec_…`), `APP_URL`, opt. `SENTRY_DSN`. (`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` auto-injectées.)
5. **`config.toml` prod** : activer `[auth.email.smtp]` (Brevo, sinon aucun email d'auth) + `[auth.hook.send_email]` (uri `https://<ref>.functions.supabase.co/send-email`, emails brandés/localisés) ; remplacer `site_url`/`additional_redirect_urls` `localhost:3001` → domaine prod web.
6. **Settings DB cron** (hors migration, SQL une fois) :
   ```sql
   ALTER DATABASE postgres SET app.sync_url        = 'https://<ref>.supabase.co/functions/v1/sync';
   ALTER DATABASE postgres SET app.attestation_url = 'https://<ref>.supabase.co/functions/v1/send-monthly-attestations';
   ALTER DATABASE postgres SET app.service_role_key = '<service-role-key>';
   ```
7. **Multi-club** : poser `clubs.sheet_id` par club **en DB** (jamais d'env `SHEET_ID` en prod) + partager chaque matrice Google en lecture avec le `client_email` du service account.

---

## 5. Matrice des variables d'environnement

> `NEXT_PUBLIC_*` = exposée au navigateur (non secrète). Le reste = **server-only/secret**. Clés uniquement.

### apps/web (Vercel)

| Variable                                                                                | Contexte          | Requis       | Notes                            |
| --------------------------------------------------------------------------------------- | ----------------- | ------------ | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                                              | public+build      | ✅           | sert aussi à dériver la CSP      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                                         | public+build      | ✅           | clé anon (RLS)                   |
| `NEXT_PUBLIC_SITE_URL`                                                                  | public+build      | ✅           | origin magic-link/invitations    |
| `SUPABASE_SERVICE_ROLE_KEY`                                                             | **server secret** | ⚠ si ADM-007 | **jamais** côté client           |
| `NEXT_PUBLIC_SENTRY_DSN`                                                                | public            | reco         | vide = no-op                     |
| `(NEXT_PUBLIC_)SENTRY_ENVIRONMENT`                                                      | server/public     | opt          | étiquette                        |
| `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT`                                       | build secret      | reco         | source-maps (sinon skip)         |
| `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`                                                | public            | opt          | vide = pas de beacon             |
| `UPSTASH_REDIS_REST_URL`/`_TOKEN`                                                       | server secret     | opt          | rate-limit (sinon fail-open)     |
| `GOOGLE_APPS_SCRIPT_URL`/`_SECRET`, `GOOGLE_SHEETS_PRICE_SHEET_ID`, `ALPHA_VANTAGE_KEY` | server            | opt          | price providers (sinon snapshot) |
| `EVOLVE_FONTS_SRC`                                                                      | build             | opt          | dossier `.otf` (sinon stubs)     |

### apps/vitrine (build LOCAL — déploiement manuel)

| Variable                                                      | Notes                                                                            |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_STRAPI_API_URL`                                  | API Strapi (défaut `http://localhost:1337/api`) — **build local avec Strapi up** |
| `NEXT_PUBLIC_STRAPI_API_TOKEN`                                | opt (le rôle Public suffit)                                                      |
| `NEXT_PUBLIC_STRAPI_URL`                                      | base médias (défaut `http://localhost:1337`)                                     |
| `DATABASE_*` (`content/.env`)                                 | Postgres local strapiDB :5433 (`DATABASE_URL` Supabase désactivé)                |
| `NEXT_PUBLIC_CONTACT_FORM_URL` / `NEXT_PUBLIC_APP_SCRIPT_URL` | Apps Script contact/newsletter                                                   |
| `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`                      | analytics vitrine                                                                |

### Edge Functions (Supabase secrets)

`GOOGLE_SA_KEY_BASE64`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `SEND_EMAIL_HOOK_SECRET`, `APP_URL`, opt. `SENTRY_DSN`/`OTP_EXPIRY_SECONDS`. `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` auto-injectées. (`SHEET_ID` n'existe PAS en prod — lu depuis `clubs.sheet_id`.)

### GitHub Actions (Settings → Secrets → Actions)

| Workflow                           | Secrets                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `ci.yml` (build apps/web sur PR)   | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (sinon build vert sans source-maps)               |
| `deploy-vitrine.yml` (**dormant**) | secrets `NEXT_PUBLIC_*` vitrine — **inutiles tant que le workflow est dormant** (deploy manuel local) |
| `lighthouse.yml`                   | aucun (placeholders)                                                                                  |

### Cron (paramètres de session Postgres — pas des env vars)

`app.sync_url`, `app.attestation_url`, `app.service_role_key` → cf. §4.6.

---

## 6. 🔒 Sécurité — actions URGENTES (repo PUBLIC)

1. **Secrets Strapi en clair** : `apps/vitrine/content/.env` contient des secrets COMPLETS (`APP_KEYS`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, `DATABASE_*`, et d'anciennes clés Supabase). Sur un repo public. → **Révoquer/rotater + sortir du repo (gitignore)** en priorité. (Le Supabase associé est mort, mais les patterns de secrets/JWT restent à rotater.)
2. **Secret formulaire en dur** : `apps/vitrine/Code.gs` valide un secret partagé **en clair** → compromis. → Properties Service + rotation.
3. **`SUPABASE_SERVICE_ROLE_KEY`** : confirmé **jamais** exposée côté client (server/Edge/scripts uniquement). Ne jamais la préfixer `NEXT_PUBLIC_`.

---

## 7. Validation post-déploiement

- **Vitrine** (après `make vitrine-deploy`, Strapi up) : `curl -I https://reseauevolvecapital.com` → 200 ; pages clés OK ; **blog peuplé** (vérifier qu'il n'est pas vide = Strapi tournait au build) ; formulaires contact/newsletter ; analytics. Pages reste sur « branch `gh-pages` ».
- **App web** : login magic link (email Brevo brandé, lien-only) → 1er clic → dashboard non vide ; sync trésorier → toast + données ; attestation PDF ; light/dark + fr/en ; curseur pointer sur les cliquables.
- **Supabase** : `db push` clean ; Edge functions répondent ; crons planifiés ; `clubs.sheet_id` posé + matrice partagée au service account.
- **Observabilité** : Sentry (DSN + CSP `*.sentry.io`) ; Cloudflare analytics.

---

### Annexe — workflows (`feat/monorepo`)

- `ci.yml` : lint + typecheck + test + build `apps/web` sur PR → `main`. Gate qualité. ⚠ **Ne couvre PAS les tests Deno ni e2e** (les lancer à part, cf. `docs/qa/README.md`).
- `deploy-vitrine.yml` : **DORMANT** (`workflow_dispatch` only) — le deploy vitrine est **manuel** (`make vitrine-deploy`). À réactiver seulement avec un Strapi distant.
- `lighthouse.yml` : Lighthouse CI sur pages publiques d'`apps/web`.
