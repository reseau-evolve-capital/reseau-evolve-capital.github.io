# CLAUDE.md — Vitrine (repo standalone)

## Ce qu'est ce repo

Site public **Next.js 15 statique** (`output: 'export'`), i18n FR/EN, déployé sur **GitHub Pages** → `reseauevolvecapital.com` (`CNAME`). Formulaires `contact.js` / `newsletter.js` → Google Apps Script (`Code.gs`).

**Règle d'or : on ne refactore JAMAIS la vitrine.** Modifs chirurgicales uniquement.

Le CMS Strapi vit dans le monorepo privé **`evolve-platform`** (`apps/cms`). La vitrine consomme l'API Strapi **à distance** uniquement.

## Blog (SSG + Strapi)

Au `pnpm build`, fetch de `NEXT_PUBLIC_STRAPI_API_URL` (`src/lib/api.ts`) → routes blog générées statiquement.

**Gotcha** : si Strapi ne répond pas, les `try/catch` renvoient `[]` → **blog vide sans erreur**. Le workflow CI a une **garde anti-blog-vide** (échec avant build).

## Build & déploiement

```bash
# Dev
pnpm dev

# Build local (Strapi distant ou local)
NEXT_PUBLIC_STRAPI_API_URL=https://strapi.reseauevolvecapital.com/api pnpm build

# Deploy manuel → branche gh-pages
make deploy

# Deploy auto : push main ou repository_dispatch « strapi-content-update »
```

**GitHub Pages** : source = **GitHub Actions** (`deploy-vitrine.yml`). Le deploy manuel `gh-pages` reste en secours.

## Variables d'environnement

Voir `.env.example`. Secrets CI : `NEXT_PUBLIC_APP_SCRIPT_URL`, `NEXT_PUBLIC_CONTACT_FORM_URL`.
