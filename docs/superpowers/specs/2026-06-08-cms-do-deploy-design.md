# Design — Déploiement Strapi (apps/cms) sur DigitalOcean derrière Traefik

**Date** : 2026-06-08 · **Branche** : `feat/cms-do-deploy` · **Statut** : artefacts produits,
déploiement droplet à exécuter par l'humain (cf. `docs/infra/RUNBOOK-cms-digitalocean.md`).

## Objectif

Héberger Strapi (le CMS du blog) sur le droplet DigitalOcean existant (Ubuntu, 1 vCPU /
2 Go RAM / 2 Go swap, qui fait déjà tourner LibreChat + un Traefik v3), de façon **isolée et
indépendamment déployable**, sans perturber les apps voisines. La vitrine (GitHub Pages)
consommera ensuite ce Strapi distant au build.

## Hypothèses confrontées au code (deltas vs brief initial)

| #   | Hypothèse du brief                                                                                      | Réalité du code                                                                                                                                                                                                  | Décision                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Build context = racine monorepo (lockfile + packages partagés) ; slim via `turbo prune` / `pnpm deploy` | `apps/cms` est **exclu du pnpm-workspace** (`pnpm-workspace.yaml` → `!apps/cms`), **yarn classic**, **Node 22**, **zéro dépendance `@evolve/*`**                                                                 | **Build context = `apps/cms`**. Build = `yarn install --frozen-lockfile && yarn build`. Pas de turbo/pnpm.                                                     |
| 2   | (base image implicite)                                                                                  | Dockerfiles existants en `node:18` ; engines `<=22.x`, `.nvmrc=22`                                                                                                                                               | **`node:22-alpine`**                                                                                                                                           |
| 3   | Production compose nouveau, séparé du local                                                             | `docker-compose.prod.yml` (template : build on-host, ports publics, postgres embarqué, pas de Traefik) + `Dockerfile.prod` **cassé** (copie un `package-lock.json` inexistant, `npm install` sur un projet yarn) | **Nouveaux** `docker-compose.production.yml` + `Dockerfile.production` ; **suppression** des deux fichiers cassés/template ; Makefile `strapi-prod-*` repointé |
| 4   | Uploads = volume local ; Spaces différé                                                                 | Provider `local` → `public/uploads` → `/opt/app/public/uploads`. Note CLAUDE.md « local KO en prod » = artefact **localhost**                                                                                    | **Volume confirmé** : une fois `URL` posée, `/uploads/...` est public en HTTPS → la vitrine (`getStrapiMediaUrl`) sert correctement. Spaces **différé**.       |
| 5   | CORS pour la vitrine (+ web si runtime)                                                                 | Seule la **vitrine** consomme Strapi, **au build**, **en anonyme** (perms publiques posées au `bootstrap` de `src/index.ts`). `apps/web` ne touche jamais Strapi                                                 | CORS **peu critique** (build server-side + médias `<img>`). On scope quand même via `CMS_CORS_ORIGINS`. Le vrai besoin = `url` + `proxy:true`.                 |

## Décisions (A–F)

- **A — Image & build (CI only).** Multi-stage `apps/cms/Dockerfile.production` (node:22-alpine,
  yarn, non-root, `NODE_OPTIONS=--max-old-space-size=512`). CI `.github/workflows/deploy-cms.yml`
  sur push `main` filtré `apps/cms/**`, auth GHCR autonome (`GITHUB_TOKEN`), `platforms:
linux/amd64`, tags `:latest` + `:${{ github.sha }}`, cache GHA. Image **`ghcr.io/lionelzoc/rec-cms`**.
- **B — Compose prod.** `apps/cms/docker-compose.production.yml`, projet `-p strapi`. Service
  `strapi` (image GHCR, **pas de `build:`**, pas de port public, réseaux `[web, internal]`, labels
  Traefik host `strapi.reseauevolvecapital.com` / resolver `le` / port 1337, volume `strapi-uploads`)
  - `strapi-db` (`postgres:16-alpine`, **réseau `internal` only**, healthcheck, volume `strapi-db-data`).
    `web` `external: true`. **Base Postgres dédiée** (Strapi 5 supporte PG 14–16 ; le dump local PG15
    se restaure dans PG16).
- **C — Médias = volume nommé** `strapi-uploads:/opt/app/public/uploads`. Provider local conservé.
  Hypothèse **single-instance** assumée explicitement. Spaces/S3 = upgrade différé (providers déjà
  présents dans `package.json`).
- **D — Sauvegardes.** `scripts/backup-db.sh` (pg_dump compressé + rétention, cron droplet) +
  recommandation **DO Droplet Backups** (off-droplet, couvre DB + médias). Volume médias inclus
  dans tout tar manuel.
- **E — Config Strapi.** `config/server.ts` : `url: env('URL')` + `proxy: env.bool('IS_PROXIED', false)`
  (env-driven → local intact). `config/middlewares.ts` : `.filter(Boolean)` sur les directives CSP
  (supprime le `undefined` de `SUPABASE_URL`) + `strapi::cors` piloté par `CMS_CORS_ORIGINS`.
  `.env.production.example` : 5 secrets + DB + `URL`/`IS_PROXIED` + instructions de génération.
- **F — Script de déploiement.** `scripts/deploy-production.sh` : vérifie réseau `web` + Traefik,
  `pull` + `up -d` + `ps`. **Jamais `down -v`.**

## Bonus demandé — réactivation de `deploy-vitrine.yml`

Réactivé (push `main` + `repository_dispatch strapi-content-update` + manuel), pointe sur le Strapi
distant, avec une **garde anti-blog-vide** : une étape `curl` échoue le job si `/api/articles` ne
renvoie aucun article → on ne publie jamais un blog vide par-dessus le live (c'était la raison
historique du gel du workflow).

## Risques

- **RAM serrée** : 2 Go + 2 Go swap déjà partagés avec LibreChat. Mitigations : build en CI (pas de
  pic sur la box), `NODE_OPTIONS` borné, `mem_limit` disponibles (commentés). **Vérifier `docker
stats` post-deploy ; un droplet 4 Go est le foyer plus sûr.**
- **Disque** : image ~0,6–1 Go + PG ~80 Mo + volumes croissants — OK dans ~8 Go libres (extensible 50 Go).
- **DNS `.fr`** : domaine distinct du `.com` de la vitrine — à confirmer côté zone DNS.

## Artefacts livrés

```
apps/cms/Dockerfile.production            (nouveau)
apps/cms/.dockerignore                    (resserré)
apps/cms/docker-compose.production.yml    (nouveau)
apps/cms/.env.production.example          (nouveau)
apps/cms/scripts/deploy-production.sh     (nouveau, +x)
apps/cms/scripts/backup-db.sh             (nouveau, +x)
apps/cms/config/server.ts                 (édité : url + proxy)
apps/cms/config/middlewares.ts            (édité : CSP filter + cors)
.github/workflows/deploy-cms.yml          (nouveau)
.github/workflows/deploy-vitrine.yml      (réactivé + garde)
Makefile                                  (strapi-prod-* repointés)
apps/cms/Dockerfile.prod                  (SUPPRIMÉ — cassé)
apps/cms/docker-compose.prod.yml          (SUPPRIMÉ — template)
docs/infra/RUNBOOK-cms-digitalocean.md    (runbook droplet)
apps/cms/CLAUDE.md, README-DOCKER.md      (docs mises à jour)
```

## Décisions laissées à l'humain

PAT GitHub `read:packages` (image privée) · zone DNS `.fr` · toggle DO Droplet Backups ·
upgrade Spaces différé · éventuel passage en droplet 4 Go. Détail : runbook §0.
