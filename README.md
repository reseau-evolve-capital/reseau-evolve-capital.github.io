# Réseau Evolve Capital — Vitrine

Site public **Next.js 15** (export statique), i18n FR/EN, déployé sur **GitHub Pages** → [reseauevolvecapital.com](https://reseauevolvecapital.com).

Le blog est généré en SSG depuis **Strapi** (`strapi.reseauevolvecapital.com`). Le CMS vit dans le monorepo privé [`evolve-platform`](https://github.com/reseau-evolve-capital/evolve-platform).

## Prérequis

- Node.js ≥ 20
- pnpm ≥ 9

## Dev local

```bash
pnpm install
cp .env.example .env.local
# Renseigner Strapi local OU utiliser l'API distante en build
pnpm dev
```

## Build & déploiement

**CI (recommandé)** : push sur `main` → workflow `deploy-vitrine.yml` (garde anti-blog-vide Strapi).

**Manuel (secours)** :

```bash
NEXT_PUBLIC_STRAPI_API_URL=https://strapi.reseauevolvecapital.com/api \
NEXT_PUBLIC_STRAPI_URL=https://strapi.reseauevolvecapital.com \
make deploy
```

## Règle d'or

Modifications **chirurgicales** uniquement — pas de refacto large. Voir `CLAUDE.md`.
