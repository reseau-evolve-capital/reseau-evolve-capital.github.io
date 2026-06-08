# DEPLOY.md — Guide de déploiement (Evolve Capital)

Monorepo **pnpm + Turborepo**, deux applications + back **Supabase** :

| Cible            | App                                                   | Hébergement                                                             | Domaine                               |
| ---------------- | ----------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| Vitrine publique | `apps/vitrine` (Next.js `output: 'export'`, statique) | **GitHub Pages** — branche **`gh-pages`**, **déploiement MANUEL local** | `reseauevolvecapital.com` (CNAME)     |
| App membre       | `apps/web` (Next.js 16 SSR)                           | **Vercel** (à configurer)                                               | (sous-domaine à définir, ex. `app.…`) |
| Back             | `supabase/` (Postgres + Edge Functions)               | **Supabase** (projet à lier)                                            | `https://<ref>.supabase.co`           |

> **Règle d'or (CLAUDE.md) : « La vitrine ne casse jamais. »** Détail vitrine faisant autorité : **`apps/vitrine/CLAUDE.md`**.

---

## ⚠️ 0. À SAVOIR sur le déploiement vitrine

Depuis l'hébergement de **Strapi à distance** (`strapi.reseauevolvecapital.com` sur DigitalOcean, cf. `docs/infra/RUNBOOK-cms-digitalocean.md`), le déploiement vitrine peut passer par **CI** :

- Le workflow `.github/workflows/deploy-vitrine.yml` est **RÉACTIVÉ** (push `main` filtré `apps/vitrine/**` + `repository_dispatch strapi-content-update` + manuel). Il build en consommant le Strapi distant.
- **Garde anti-blog-vide** : une étape `curl /api/articles` **échoue le job AVANT le build** si Strapi est injoignable ou ne renvoie aucun article → le site en ligne n'est **jamais** écrasé par un blog vide (c'était la raison historique du gel).
- Déploiement **manuel local** toujours possible : `make vitrine-export` (Strapi up) → `make vitrine-deploy` (`gh-pages -d out -t` → branche `gh-pages`).

### 🔀 Bascule de la source GitHub Pages (action humaine, à séquencer)

Le workflow déploie via **`actions/deploy-pages`** → il exige que **GitHub Pages soit réglé sur _« Source : GitHub Actions »_** (et non plus _« Deploy from a branch : `gh-pages` »_). Ces deux modes sont **mutuellement exclusifs**. **Séquence sûre, sans coupure :**

1. Merger ce travail sur `main` : le workflow tournera et **échouera à l'étape « Vérifier Strapi »** tant que le droplet n'est pas live → **aucun déploiement, aucun impact** (Pages reste servi depuis `gh-pages`).
2. Déployer Strapi sur le droplet (runbook) et vérifier que `/api/articles` renvoie des articles.
3. **Basculer** Settings → Pages → **Source : GitHub Actions**, puis lancer **Run workflow** (manuel). La garde passe, le build se déploie via Actions.
4. Ensuite, tout push `main` (vitrine) ou `repository_dispatch` redéploie automatiquement.

> Tant que la bascule n'est pas faite, le site reste servi par la branche `gh-pages` (mode actuel) — le workflow réactivé est « armé » mais sans effet (échec garde / mode branche). Aucun risque pour le live.

**Pourquoi le build exige Strapi** : le blog est généré en SSG (`generateStaticParams` → API Strapi). Si Strapi ne tourne pas, les `try/catch` de `src/lib/api.ts` renvoient `[]` et **le blog se build vide, sans erreur**. La garde CI couvre ce cas ; en local, toujours démarrer Strapi avant `make vitrine-export`.

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

1. Réglage GitHub Pages : voir **§0 (bascule de source)** — historiquement « branch `gh-pages` », à basculer sur « GitHub Actions » une fois Strapi distant live.
2. `deploy-vitrine.yml` est désormais **réactivé** (cf. §0) avec garde anti-blog-vide — l'ancienne consigne « garder dormant » est **caduque**.
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
- ✅ **Images en prod (résolu par le Strapi distant)** : une fois Strapi servi sur `https://strapi.reseauevolvecapital.com` (provider `local` + volume `strapi_strapi-uploads`, `URL` posée), les médias `/uploads/...` sont **publics en HTTPS** → la vitrine statique les sert correctement (`getStrapiMediaUrl` préfixe via `NEXT_PUBLIC_STRAPI_URL`). DO Spaces/S3 = upgrade **différé** (cf. runbook). _En dev local, ils restent sur `localhost:1337`._
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

### Strapi distant (CMS) — voir runbook dédié

Strapi est hébergé sur **DigitalOcean** derrière Traefik (`strapi.reseauevolvecapital.com`), image
buildée en CI → GHCR, tirée par le droplet. Artefacts dans `apps/cms/` (`Dockerfile.production`,
`docker-compose.production.yml`, `scripts/`) + CI `.github/workflows/deploy-cms.yml`. **Procédure
complète (DNS, secrets, migration contenu, TLS, smoke test, rollback) :
`docs/infra/RUNBOOK-cms-digitalocean.md`.** Une fois live, voir §0 pour la bascule de la source Pages.

---

## 3. App membre → Vercel (`apps/web`)

> **État : DÉPLOYÉ.** Projet Vercel `evolve-web` (team « Evolve Capital's projects »), live sur `*.vercel.app` + domaine `app.reseauevolvecapital.com` (CNAME à propager). Config dans `apps/web/vercel.json` + `.vercelignore` (racine). Indépendant de la vitrine.

### Réglages Vercel (tels que déployés)

- ⚠ **Root Directory = `apps/web`** (réglage projet, PAS la racine). Sinon échec « No Next.js version detected » (Vercel cherche `next` dans le `package.json` du Root Directory). Vercel upload tout le repo (workspace pnpm) mais build dans `apps/web`.
- **`apps/web/vercel.json`** encode `framework: nextjs`, `installCommand: pnpm install --frozen-lockfile`, `buildCommand: node ../../scripts/ensure-fonts.mjs && next build`. Le `&& ensure-fonts` garantit les polices avant Turbopack (sinon casse sur les `@font-face url()`). `outputDirectory` laissé au défaut (`.next`) — **ne PAS** poser `apps/web/.next` au niveau projet (résolu relativement au Root Directory → `apps/web/apps/web/.next`).
- **`.vercelignore` (racine) est OBLIGATOIRE** : sans lui l'upload dépasse 2 Gio (`.turbo` ~17 Gio, `.next`, `node_modules`, `apps/vitrine/content` ~1 Gio). Exclut aussi `.env*` (les secrets ne montent jamais ; Vercel injecte ses propres env vars).
- ⚠ **`NEXT_PUBLIC_SUPABASE_URL` doit être dans l'env de BUILD** (pas que runtime) : `next.config.ts` en dérive la CSP (`connect-src`/`img-src`) au build. Absente au build → CSP prod bloque tous les appels Supabase.
- **Deployment Protection** : `ssoProtection` réglé sur **preview-only** (sinon SSO Vercel renvoie 401 sur toute la prod → membres bloqués). Previews restent privées.
- **Node** : 20 (`.nvmrc`). SSR classique (pas d'`output: export/standalone`).
- **Env vars** : posées via `vercel env add <NAME> production` (ou dashboard) — cf. matrice §5. **`SUPABASE_ACCESS_TOKEN` (`sbp_…`)** requis pour `supabase secrets` côté Edge (pas pour Vercel).

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

| Workflow                            | Secrets                                                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml` (build apps/web sur PR)    | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (sinon build vert sans source-maps)                                                                                               |
| `deploy-vitrine.yml` (**réactivé**) | secrets `NEXT_PUBLIC_*` vitrine + **variables** (Settings → Variables) `NEXT_PUBLIC_STRAPI_API_URL`/`NEXT_PUBLIC_STRAPI_URL` optionnelles (défaut = `strapi.reseauevolvecapital.com`) |
| `deploy-cms.yml` (build image CMS)  | aucun secret custom — auth GHCR via `GITHUB_TOKEN` intégré (`packages: write`)                                                                                                        |
| `lighthouse.yml`                    | aucun (placeholders)                                                                                                                                                                  |

### Cron (paramètres de session Postgres — pas des env vars)

`app.sync_url`, `app.attestation_url`, `app.service_role_key` → cf. §4.6.

---

## 6. 🔒 Sécurité — actions URGENTES (repo PUBLIC)

1. **Secrets Strapi en clair** : `apps/cms/.env` contient des secrets COMPLETS (`APP_KEYS`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, `DATABASE_*`, et d'anciennes clés Supabase). Il est **gitignoré** (jamais commité) mais reste sur disque local. → **Générer des secrets NEUFS pour la prod** (`.env` du droplet, cf. `.env.production.example`) — ne **jamais** réutiliser ceux du `.env` local de dev. (Le Supabase associé est mort, mais les patterns de secrets/JWT restent à rotater.)
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

- `ci.yml` : lint + typecheck + test + build `apps/web` sur PR → `main`. Gate qualité. ⚠ **Ne couvre PAS les tests Deno ni e2e** (les lancer à part, cf. `docs/qa/README.md`). Ne couvre **pas** `apps/cms` (hors workspace pnpm).
- `deploy-vitrine.yml` : **RÉACTIVÉ** (push `main` `apps/vitrine/**` + `repository_dispatch strapi-content-update` + manuel) avec **garde anti-blog-vide** ; consomme le Strapi distant. Bascule de la source Pages → §0.
- `deploy-cms.yml` : build multi-stage `apps/cms` (node:22, yarn, `linux/amd64`) → push GHCR `ghcr.io/lionelzoc/rec-cms:{latest,<sha>}` sur push `main` (`apps/cms/**`). Le droplet **pull** (jamais de build sur la box). Cf. `docs/infra/RUNBOOK-cms-digitalocean.md`.
- `lighthouse.yml` : Lighthouse CI sur pages publiques d'`apps/web`.
