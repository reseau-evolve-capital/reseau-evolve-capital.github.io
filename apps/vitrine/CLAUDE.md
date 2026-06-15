# CLAUDE.md — `apps/vitrine`

Guidance Claude Code pour le site vitrine. Complète le `CLAUDE.md` racine — en cas de conflit, la racine prime.

## Ce qu'est la vitrine

Site public **Next.js 15 statique** (`next.config.ts` → `output: 'export'`, `trailingSlash: true`, images `unoptimized`), i18n FR/EN, déployé sur **GitHub Pages** via le domaine `reseauevolvecapital.com` (`CNAME`). Formulaires `contact.js` / `newsletter.js` reliés à un Google Apps Script (`Code.gs`).

**Règle d'or (cf. racine) : on ne refactore JAMAIS la vitrine.** Modifs chirurgicales uniquement. Confirmer avant toute action destructive sur `contact.js`, `newsletter.js`, `Code.gs`, `marketing/`, `messages/`, `next.config.ts`, `Dockerfile`.

## Blog : contenu servi par le CMS Strapi (`apps/cms`)

La vitrine est **SSG** : au `next build`, elle fetch l'API Strapi via `NEXT_PUBLIC_STRAPI_API_URL` (défaut `http://localhost:1337/api`) dans `src/lib/api.ts` → les routes `blog/[slug]`, `blog/page`, `blog/category/[id]` sont générées statiquement.

**⚠ Gotcha** : si Strapi ne tourne pas au moment du build, les `try/catch` renvoient `[]` et **le blog se build vide, sans erreur**. Le workflow CI `deploy-vitrine.yml` build désormais contre le **Strapi distant** (`strapi.reseauevolvecapital.com`) avec une **garde anti-blog-vide** (échec du job si l'API ne renvoie aucun article) et se déclenche sur push `main` (paths vitrine), `repository_dispatch` (webhook contenu Strapi) et manuel. Le deploy local (Strapi démarré) reste possible en secours.

Pour démarrer Strapi, restaurer la base ou configurer les variables Strapi → voir **[`apps/cms/CLAUDE.md`](../cms/CLAUDE.md)**.

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

**Source GitHub Pages** : ce flux local suppose un Pages réglé sur _"Deploy from branch: `gh-pages`"_. Incompatible avec le déploiement _"GitHub Actions"_ (`deploy-vitrine.yml`, désormais actif) — choisir l'un OU l'autre, pas les deux.

> ⚠ **Images en prod** : le provider d'upload Strapi est **local** → les médias ne sont servis que sur `localhost:1337`, donc **absents du site statique déployé**. Pour des images publiques en prod, recâbler un provider de storage **public** (nouveau bucket Supabase / S3 / Cloudinary) dans `apps/cms/config/plugins.ts` et re-uploader. C'est un follow-up à traiter avant de redéployer un blog avec images.

## Variables d'environnement

| Var                                       | Où            | Rôle                                                             |
| ----------------------------------------- | ------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_STRAPI_API_URL`              | build vitrine | URL API Strapi (défaut `http://localhost:1337/api`)              |
| `NEXT_PUBLIC_STRAPI_API_TOKEN`            | build vitrine | token lecture Strapi (optionnel — rôle Public activé en anonyme) |
| `NEXT_PUBLIC_STRAPI_URL`                  | build vitrine | base pour préfixer les médias relatifs (`http://localhost:1337`) |
| `NEXT_PUBLIC_*` (Google Script / contact) | build vitrine | formulaires contact/newsletter                                   |

Les variables internes à Strapi (`DATABASE_*`, etc.) vivent dans `apps/cms/.env` — voir [`apps/cms/CLAUDE.md`](../cms/CLAUDE.md).
