# CLAUDE.md — apps/cms (Strapi / CMS du blog)

App autonome **Strapi 5** gérant le contenu éditorial du blog de la vitrine. Elle est hors du pnpm-workspace du monorepo (yarn classic, Node 22 LTS) et peut être déployée seule, indépendamment de `apps/vitrine` ou d'`apps/web`, à terme sur DigitalOcean.

La vitrine (`apps/vitrine`) consomme l'API Strapi **à distance** via `NEXT_PUBLIC_STRAPI_API_URL` (HTTP) — aucun couplage filesystem entre les deux apps.

## Pipeline blog : Strapi local + Postgres local + médias disque

```
[Strapi local :1337]  ── DB ──▶  Postgres LOCAL (Docker, conteneur strapiDB :5433)
  (apps/cms/, yarn,   ── assets ─▶ disque (provider "local" → apps/cms/public/uploads)
   Node 22 LTS)
        ▲
        │ @strapi/client  (apps/vitrine/src/lib/strapi.ts + api.ts)
        │ via NEXT_PUBLIC_STRAPI_API_URL
        │
[next build vitrine]  ── generateStaticParams ──▶  pages blog statiques  ──▶  out/
```

- **Historique (important)** : à l'origine la DB Strapi **et** les assets vivaient sur un **projet Supabase distant**. Ce projet a été mis en pause **>90 jours → définitivement non-restaurable** (constaté juin 2026). Les données ont été récupérées d'un dump cluster (`db_cluster-*.backup.gz`) et **restaurées dans un Postgres local**. ⚠ Les **bytes des images** étaient dans le Supabase Storage mort → **perdus** : les enregistrements `files` pointent vers des URLs `*.supabase.co` en 404 ; re-uploader si besoin.
- **DB** : Postgres **local** dans le conteneur Docker `strapiDB` (`apps/cms/docker-compose.yml` : port hôte **5433**, base `strapi`, user `strapi`, volume nommé `strapi-data`). Instance **séparée** de la stack Supabase locale d'`apps/web` (port 54322) → aucune collision de tables possible. `apps/cms/config/database.ts` lit `DATABASE_HOST/PORT/...` (le `DATABASE_URL` Supabase est désactivé dans `apps/cms/.env`).
- **Assets** : provider d'upload **local** (`apps/cms/config/plugins.ts` → `provider: "local"`), uploads dans `apps/cms/public/uploads`.
- `apps/vitrine/src/lib/api.ts` interroge `NEXT_PUBLIC_STRAPI_API_URL || http://localhost:1337/api`. Les routes `blog/[slug]`, `blog/page`, `blog/category/[id]` appellent `getAllArticles('fr'|'en')` dans `generateStaticParams`.

## ⚠ Volume Docker — épinglage du nom de projet compose

Le fichier `apps/cms/docker-compose.yml` déclare **`name: content`** (≠ nom du dossier `apps/cms`).

**Ne jamais changer cette valeur.** Le volume Postgres restauré du blog s'appelle `content_strapi-data` (Docker préfixe le nom de projet). Si le `name` devenait `cms`, Docker créerait un nouveau volume `cms_strapi-data` vide et la base restaurée serait orpheline — il faudrait tout re-restaurer. L'épinglage `name: content` est intentionnel et doit rester (cf. ticket EDI-000).

## ⚠ Gotcha critique : le build du blog exige Strapi up

`next build` lance `generateStaticParams` côté vitrine → si **Strapi ne tourne pas**, les `try/catch` de `api.ts` renvoient `[]` et **le blog se build vide, sans erreur**.

- **Le deploy se fait en local**, Strapi démarré, **pas en CI** (le conteneur Strapi ne tourne pas sur GitHub Actions).
- ⚠ Le workflow `.github/workflows/deploy-vitrine.yml` build **sans** Strapi → il publierait un **blog vide** sur merge `main`. Le garder **dormant** tant que Strapi n'est pas hébergé sur un serveur distant.

## Démarrer Strapi en local

Strapi exige **Node 22 LTS** (engines `<=22.x` ; `apps/cms/.nvmrc=22`, bascule auto via nvm dans `make strapi-dev`).

```bash
# 1. Démarrer le Postgres local de Strapi (conteneur Docker, port 5433)
make strapi-db-up
# 2a. Strapi en natif (recommandé) — bascule Node 22 via nvm puis yarn develop
make strapi-dev                       # admin sur http://localhost:1337/admin
# 2b. … ou Strapi en conteneur Docker
make strapi-up && make strapi-logs
```

- **Mot de passe admin** : les comptes (`lionel@omniventus.com`, …) sont restaurés mais le mot de passe est inconnu → le réinitialiser :
  `cd apps/cms && yarn strapi admin:reset-user-password --email lionel@omniventus.com --password '<nouveau>'`
- `apps/cms/.env` est **déjà configuré** (DB locale). **Ne pas** lancer `make strapi-env` / `cp .env.docker .env` : ça écraserait le `.env` réel.

### Restaurer (ou re-restaurer) le contenu depuis un dump Supabase

```bash
make strapi-db-up
make strapi-db-restore BACKUP=db_cluster-09-07-2025@08-23-41.backup.gz
```

`apps/cms/scripts/restore-cluster-dump.sh` charge le dump cluster, n'en garde que le schéma `public` (Strapi) et ignore la plomberie Supabase (auth/storage/vault/graphql/realtime). ⚠ **Destructif** : remplace le schéma `public` de la base `strapi`.

> **Permissions publiques (gotcha)** : la vitrine consomme l'API Strapi en **anonyme** (pas d'API token au build) → le rôle **Public** doit avoir `find`/`findOne` sur `article`/`category`/`author`/`tag`, sinon `/api/articles` renvoie **403** et le blog se build vide. Ces permissions **ne sont pas dans le dump** (l'ancien front utilisait un API token) → elles sont (re)accordées **automatiquement au démarrage** par `apps/cms/src/index.ts` (`bootstrap`, idempotent). Après un restore, **redémarrer Strapi** pour qu'elles soient (ré)appliquées.

| Commande Make                          | Effet                              |
| -------------------------------------- | ---------------------------------- |
| `make strapi-db-up` / `strapi-db-down` | démarre / arrête le Postgres local |
| `make strapi-db-shell`                 | `psql` sur la base `strapi`        |
| `make strapi-db-restore BACKUP=…`      | restaure un dump cluster `.gz`     |

## Variables d'environnement

| Var                                         | Où              | Rôle                                                                                           |
| ------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| `DATABASE_*` (HOST/PORT/NAME/USER/PASSWORD) | `apps/cms/.env` | Postgres **local** (conteneur strapiDB :5433). `DATABASE_URL` désactivé (ancien Supabase mort) |
| ~~`SUPABASE_API_URL/...`~~                  | `apps/cms/.env` | **obsolète** — storage mort, provider d'upload désormais `local`                               |

Les variables de consommation côté vitrine (`NEXT_PUBLIC_STRAPI_API_URL`, `NEXT_PUBLIC_STRAPI_API_TOKEN`, `NEXT_PUBLIC_STRAPI_URL`) vivent dans l'environnement de build de `apps/vitrine`, pas ici.

## Corepack / yarn

Le `package.json` racine du monorepo déclare `packageManager: pnpm`, donc `yarn` lancé dans `apps/cms/` serait bloqué par corepack (« This project is configured to use pnpm »). Pour maintenir yarn ici, le `package.json` de `apps/cms` épingle `"packageManager": "yarn@1.22.22"` — corepack prend le champ le plus proche du cwd. **Ne pas retirer ce champ**, sinon `make strapi-dev` / `yarn …` cassent dans `apps/cms`.

## Roadmap : Strapi distant

À moyen terme, héberger Strapi sur un **serveur distant** (DigitalOcean). Le build CI (`deploy-vitrine.yml`) redevient alors viable en pointant `NEXT_PUBLIC_STRAPI_API_URL` sur l'instance distante. `apps/cms/docker-compose.prod.yml` (multi-stage `Dockerfile.prod`) est le point de départ self-host, **mais** il relance un `strapiDB` postgres local → à réconcilier avec le choix de DB en production avant usage.
