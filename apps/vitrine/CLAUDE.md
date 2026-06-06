# CLAUDE.md — `apps/vitrine`

Guidance Claude Code pour le site vitrine. Complète le `CLAUDE.md` racine — en cas de conflit, la racine prime.

## Ce qu'est la vitrine

Site public **Next.js 15 statique** (`next.config.ts` → `output: 'export'`, `trailingSlash: true`, images `unoptimized`), i18n FR/EN, déployé sur **GitHub Pages** via le domaine `reseauevolvecapital.com` (`CNAME`). Formulaires `contact.js` / `newsletter.js` reliés à un Google Apps Script (`Code.gs`).

**Règle d'or (cf. racine) : on ne refactore JAMAIS la vitrine.** Modifs chirurgicales uniquement. Confirmer avant toute action destructive sur `content/`, `contact.js`, `newsletter.js`, `Code.gs`, `marketing/`, `messages/`, `next.config.ts`, `Dockerfile`.

## Pipeline blog : Strapi local + Postgres local + médias disque

Le blog est **généré en SSG** à partir d'un **Strapi 5** embarqué dans `apps/vitrine/content`.

```
[Strapi local :1337]  ── DB ──▶  Postgres LOCAL (Docker, conteneur strapiDB :5433)
  (content/, yarn,     ── assets ─▶ disque (provider "local" → content/public/uploads)
   Node 22 LTS)
        ▲
        │ @strapi/client  (src/lib/strapi.ts + api.ts)
        │
[next build vitrine]  ── generateStaticParams ──▶  pages blog statiques  ──▶  out/
```

- **Historique (important)** : à l'origine la DB Strapi **et** les assets vivaient sur un **projet Supabase distant**. Ce projet a été mis en pause **>90 jours → définitivement non-restaurable** (constaté juin 2026). Les données ont été récupérées d'un dump cluster (`db_cluster-*.backup.gz`) et **restaurées dans un Postgres local**. ⚠ Les **bytes des images** étaient dans le Supabase Storage mort → **perdus** : les enregistrements `files` pointent vers des URLs `*.supabase.co` en 404 ; re-uploader si besoin.
- **DB** : Postgres **local** dans le conteneur Docker `strapiDB` (`content/docker-compose.yml` : port hôte **5433**, base `strapi`, user `strapi`, volume nommé `strapi-data`). Instance **séparée** de la stack Supabase locale d'`apps/web` (port 54322) → aucune collision de tables possible. `content/config/database.ts` lit `DATABASE_HOST/PORT/...` (le `DATABASE_URL` Supabase est désactivé dans `content/.env`).
- **Assets** : provider d'upload **local** (`content/config/plugins.ts` → `provider: "local"`), uploads dans `content/public/uploads`.
- `src/lib/api.ts` interroge `NEXT_PUBLIC_STRAPI_API_URL || http://localhost:1337/api`. Les routes `blog/[slug]`, `blog/page`, `blog/category/[id]` appellent `getAllArticles('fr'|'en')` dans `generateStaticParams`.

### ⚠ Gotcha critique : le build du blog exige Strapi up

`next build` lance `generateStaticParams` → si **Strapi ne tourne pas**, les `try/catch` de `api.ts` renvoient `[]` et **le blog se build vide, sans erreur**. Donc :

- **Le deploy se fait en local**, Strapi démarré, **pas en CI** (le conteneur Strapi ne tourne pas sur GitHub Actions).
- ⚠ Le workflow `.github/workflows/deploy-vitrine.yml` build **sans** Strapi → il publierait un **blog vide** sur merge `main`. Le garder **dormant** tant que Strapi n'est pas hébergé sur un serveur distant.

`content/` est en **yarn classic** (`yarn.lock`), **hors pnpm-workspace** — gérer ses dépendances avec yarn, jamais avec pnpm.

> **Corepack** : le `package.json` racine déclare `packageManager: pnpm`, donc `yarn` lancé dans `content/` est bloqué par corepack (« This project is configured to use pnpm »). Pour que `content/` reste en yarn, son `package.json` épingle `"packageManager": "yarn@1.22.22"` — corepack prend le champ le plus proche du cwd. **Ne pas retirer ce champ**, sinon `make strapi-dev` / `yarn …` cassent dans `content/`.

## Démarrer Strapi en local

Strapi exige **Node 22 LTS** (engines `<=22.x` ; `content/.nvmrc=22`, bascule auto via nvm dans `make strapi-dev`).

```bash
# 1. Démarrer le Postgres local de Strapi (conteneur Docker, port 5433)
make strapi-db-up
# 2a. Strapi en natif (recommandé) — bascule Node 22 via nvm puis yarn develop
make strapi-dev                       # admin sur http://localhost:1337/admin
# 2b. … ou Strapi en conteneur Docker
make strapi-up && make strapi-logs
```

- **Mot de passe admin** : tes comptes (`lionel@omniventus.com`, …) sont restaurés mais le mot de passe est inconnu → le réinitialiser :
  `cd apps/vitrine/content && yarn strapi admin:reset-user-password --email lionel@omniventus.com --password '<nouveau>'`
- `content/.env` est **déjà configuré** (DB locale). **Ne pas** lancer `make strapi-env` / `cp .env.docker .env` : ça écraserait le `.env` réel.

### Restaurer (ou re-restaurer) le contenu depuis un dump Supabase

```bash
make strapi-db-up
make strapi-db-restore BACKUP=db_cluster-09-07-2025@08-23-41.backup.gz
```

`content/scripts/restore-cluster-dump.sh` charge le dump cluster, n'en garde que le schéma `public` (Strapi) et ignore la plomberie Supabase (auth/storage/vault/graphql/realtime). ⚠ **Destructif** : remplace le schéma `public` de la base `strapi`.

> **Permissions publiques (gotcha)** : le site vitrine consomme l'API Strapi en **anonyme** (pas d'API token au build) → le rôle **Public** doit avoir `find`/`findOne` sur `article`/`category`/`author`/`tag`, sinon `/api/articles` renvoie **403** et le blog se build vide. Ces permissions **ne sont pas dans le dump** (l'ancien front utilisait un API token) → elles sont (re)accordées **automatiquement au démarrage** par `content/src/index.ts` (`bootstrap`, idempotent). Après un restore, **redémarrer Strapi** pour qu'elles soient (ré)appliquées.

| Commande Make                          | Effet                              |
| -------------------------------------- | ---------------------------------- |
| `make strapi-db-up` / `strapi-db-down` | démarre / arrête le Postgres local |
| `make strapi-db-shell`                 | `psql` sur la base `strapi`        |
| `make strapi-db-restore BACKUP=…`      | restaure un dump cluster `.gz`     |

## Build & déploiement (local → GitHub Pages)

Le deploy historique pousse le `out/` sur la **branche `gh-pages`** (`npx gh-pages -d out -t`, `-t` inclut les dotfiles → `.nojekyll`).

```bash
# 1. Démarrer Strapi (cf. ci-dessus) et vérifier que les articles remontent
# 2. Build + export statique  (génère apps/vitrine/out/, .nojekyll, CNAME)
make vitrine-export
# 3. Publier sur la branche gh-pages
make vitrine-deploy
```

> Les cibles `vitrine-export` / `vitrine-deploy` / `strapi-*` + le script `"deploy": "gh-pages -d out -t"` (dép `gh-pages`) sont **en place** (Makefile racine + `apps/vitrine/package.json`).

**Source GitHub Pages** : ce flux suppose un Pages réglé sur _"Deploy from branch: `gh-pages`"_. Incompatible avec le déploiement _"GitHub Actions"_ (`deploy-vitrine.yml`, gardé dormant) — choisir l'un OU l'autre, pas les deux.

> ⚠ **Images en prod** : le provider d'upload est **local** → les médias ne sont servis que sur `localhost:1337`, donc **absents du site statique déployé**. Pour des images publiques en prod, recâbler un provider de storage **public** (nouveau bucket Supabase / S3 / Cloudinary) dans `content/config/plugins.ts` et re-uploader. C'est un follow-up à traiter avant de redéployer un blog avec images.

## Variables d'environnement

| Var                                         | Où                            | Rôle                                                                                           |
| ------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_STRAPI_API_URL`                | build vitrine                 | URL API Strapi (défaut `http://localhost:1337/api`)                                            |
| `NEXT_PUBLIC_STRAPI_API_TOKEN`              | build vitrine (optionnel)     | token lecture Strapi                                                                           |
| `NEXT_PUBLIC_STRAPI_URL`                    | runtime (`getStrapiMediaUrl`) | base pour préfixer les médias relatifs (`http://localhost:1337`)                               |
| `DATABASE_*` (HOST/PORT/NAME/USER/PASSWORD) | `content/.env`                | Postgres **local** (conteneur strapiDB :5433). `DATABASE_URL` désactivé (ancien Supabase mort) |
| ~~`SUPABASE_API_URL/...`~~                  | `content/.env`                | **obsolète** — storage mort, provider d'upload désormais `local`                               |
| `NEXT_PUBLIC_*` (Google Script / contact)   | build vitrine                 | formulaires contact/newsletter                                                                 |

## Roadmap : Strapi distant

À moyen terme, héberger Strapi sur un **serveur distant**. Le build CI (et `deploy-vitrine.yml`) redevient alors viable en pointant `NEXT_PUBLIC_STRAPI_API_URL` sur l'instance distante. `content/docker-compose.prod.yml` (multi-stage `Dockerfile.prod`) est le point de départ self-host, **mais** il relance un `strapiDB` postgres local → à réconcilier avec le choix Supabase avant usage.
