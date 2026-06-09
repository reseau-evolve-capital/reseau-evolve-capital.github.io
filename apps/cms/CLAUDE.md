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

- **En local**, le deploy manuel se fait Strapi démarré : `make vitrine-deploy`.
- ✅ **Depuis le déploiement DigitalOcean**, `.github/workflows/deploy-vitrine.yml` est **réactivé** (push `main` + `repository_dispatch` + manuel) et consomme le Strapi distant `strapi.reseauevolvecapital.com`. Une **garde anti-blog-vide** (étape « Vérifier Strapi ») échoue le job si l'API ne renvoie aucun article → le site en ligne n'est jamais écrasé par un blog vide.

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

## Déploiement : Strapi distant (DigitalOcean derrière Traefik)

Strapi est déployé sur un **droplet DigitalOcean** (Ubuntu, derrière un Traefik v3 partagé)
sur le domaine **`strapi.reseauevolvecapital.com`**. Artefacts dans ce dossier :

- **`Dockerfile.production`** — build multi-stage `node:22-alpine` (yarn), **construit en CI**,
  jamais sur le droplet (2 Go → OOM). Contexte de build = `apps/cms` (app autonome).
- **`docker-compose.production.yml`** — projet compose isolé `-p strapi` : service `strapi`
  (image GHCR `ghcr.io/reseau-evolve-capital/rec-cms:latest`, labels Traefik, réseaux `web`+`internal`,
  volume `strapi-uploads`) + `strapi-db` (`postgres:16-alpine`, réseau `internal` only,
  volume `strapi-db-data`). **PROPRE base Postgres** (≠ la DB locale de dev).
- **`.env.production.example`** — modèle des secrets + DB + `URL` + `IS_PROXIED`.
- **`scripts/deploy-production.sh`** (pull + up sur le droplet, jamais `down -v`) et
  **`scripts/backup-db.sh`** (pg_dump nocturne, rétention).
- CI : **`.github/workflows/deploy-cms.yml`** build+push l'image sur GHCR (push `main`,
  `paths: apps/cms/**`).
- Médias : provider **local** + volume nommé `strapi-uploads`. Une fois `URL` posée, les
  URLs `/uploads/...` deviennent publiques (`https://strapi.reseauevolvecapital.com/uploads/...`)
  → la vitrine statique les sert correctement. (DO Spaces / S3 = upgrade DIFFÉRÉ, single-instance.)

**Runbook droplet complet (DNS, secrets, migration contenu, TLS, smoke test) :**
`docs/infra/RUNBOOK-cms-digitalocean.md`.

## Traduction FR→EN du blog (plugin strapi-llm-translator)

Plugin **`strapi-llm-translator`** (grenzbotin), version **`0.11.0`**, peer `@strapi/strapi >=5.12.3` (OK sur notre **5.12.6**, testé 5.12.x). Installé via `yarn add` puis **`yarn build` obligatoire** : le plugin injecte un bouton dans le Content Manager → l'admin doit être rebuildé, puis **redémarrer Strapi**.

- **Modèle « seed-once-then-editable »** : la traduction FR→EN est une **action manuelle explicite** (bouton dans le Content Manager, sur la locale **EN**, source = French), **jamais on-save**. Une sauvegarde FR ne touche **jamais** l'EN. Retraduire **écrase** le contenu EN (donc les retouches manuelles) — c'est volontaire et **uniquement déclenché à la main**.
- **Champs traduits** : tous les champs localisés `string`/`text`/`richtext` + `JSON`/`blocks`, **récursivement à travers les composants et la dynamic zone `corps`** : `title`, `excerpt`, `content` (blocks), `corps` (9 blocs), `SEOMetaTitle`, `SEOMetaDescription`. Les champs **non localisés** (`featuredImage`, dates, auteur, `type`, `numeroEdition`) restent partagés.
- **Variables d'environnement** (lues par le plugin — noms **EXACTS**, ne pas renommer) :

  | Var                                                | Rôle                                                                                                  |
  | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
  | `LLM_TRANSLATOR_LLM_API_KEY`                       | **Clé OpenAI ici** — le plugin n'utilise **PAS** `OPENAI_API_KEY`.                                     |
  | `STRAPI_ADMIN_LLM_TRANSLATOR_LLM_BASE_URL`         | Endpoint LLM, défaut OpenAI. Laisser **vide** sauf proxy/Azure.                                        |
  | `STRAPI_ADMIN_LLM_TRANSLATOR_LLM_MODEL`            | Défaut `gpt-4o` (override possible, ex. `gpt-4o-mini`).                                                |
  | `STRAPI_ADMIN_LLM_TRANSLATOR_AZURE_API_VERSION`    | Azure uniquement — **non utilisé** chez nous.                                                          |

- **⚠ Pas de « glossaire »** : il n'existe **PAS** de champ glossaire ni d'option d'exclusion de champ. Le seul levier est le **System prompt**, réglable sur la **page de config du plugin dans l'admin** (stocké **en DB**, pas dans `config/plugins.ts` ni en env). Y mettre la consigne de marque : **ne pas traduire** « La Quote-Part », « quote-part », « Réseau Evolve Capital », noms de produits ; conserver le registre finance + ton éditorial. La **température** y est aussi réglable (défaut `0.3`).
- **⚠ Slug** : notre champ `slug` est de type `string` (pas `uid`) → le plugin **le traduit** (il n'exclut automatiquement que les champs `uid`), et il n'y a **aucune config d'exclusion**. Décision EDI-008 : **reset manuel** — le rédacteur remet le slug EN identique au slug FR avant de publier (voir guide rédacteur). **Pas de code ajouté** pour ça (modèle seed-then-edit). SEO du slug EN = amélioration **différée**.
- **Permissions** : **aucun** rôle/permission à accorder — le bouton apparaît automatiquement pour tout utilisateur ayant accès à l'édition dans le Content Manager (corrige le §4 du ticket qui parlait de permissions à accorder).
- **Config `config/plugins.ts`** : une entrée explicite `'strapi-llm-translator': { enabled: true }` est ajoutée (le plugin est auto-découvert ; l'entrée explicite **documente sa présence**).
- **Confidentialité** : le contenu transite par l'API OpenAI — OK car le blog est **public**. **Ne pas** étendre ce flux à du contenu membre/privé.
