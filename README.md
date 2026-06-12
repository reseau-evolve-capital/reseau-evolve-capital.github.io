# Evolve Capital — Monorepo

Plateforme d'investissement participatif pour clubs. Monorepo pnpm + Turborepo.

## Structure

```
apps/
  vitrine/        ← Site public (Next.js 15, GitHub Pages → reseauevolvecapital.com)
  web/            ← App membre (Next.js 16, Vercel, :3001)
packages/
  design-system/  ← Tokens CSS + Tailwind V4 (zéro dépendance React)
  ui/             ← Composants React atomiques + Storybook 10 (:6006)
  types/          ← Interfaces TypeScript partagées
  data/           ← Clients Supabase + Google Sheets
  utils/          ← Fonctions pures (formatEUR, formatPct, formatDate)
```

## Fonctionnalités principales (fonctionnelles)

L'app membre `apps/web` couvre aujourd'hui (V0) :

**Authentification & onboarding**

- Connexion par **lien magique** (sans mot de passe), réservée aux emails **invités** (allowlist).
- **Onboarding** en 3 étapes (identité → coordonnées → consentements RGPD/annuaire) + **tour guidé**.

**Espace membre**

- **Tableau de bord** : quote-part, indicateurs (détention, total cotisé, statut cotisation), bandeau de synchronisation.
- **Portefeuille du club** : positions, **donut** de répartition sectorielle, tri/filtre, valorisation live (avec repli sur le snapshot).
- **Mes cotisations** : frise mensuelle par statut, indicateurs, alerte de retard.

**Espace trésorier** (rôles trésorier / président / admin réseau)

- **Tableau de bord club** (KPIs, alerte impayés, **synchronisation manuelle**), **Membres** (liste, filtre impayés, colonne Accès), **Cotisations** (frise club, filtre par membre).
- **Invitations** : génération d'un **lien d'accès nominatif valable 72 h** (à copier/transmettre), renvoyer, révoquer ; statuts En attente / Acceptée / Expirée / Révoquée. **À l'acceptation, l'invité devient automatiquement membre actif du club.**
- **Contrôle d'accès** : **bloquer / débloquer** un membre (motif facultatif, réversible, par club) ; le membre bloqué voit un écran **« Accès suspendu »**.

**Internationalisation & thème**

- **FR par défaut**, bascule **EN** via sélecteur (cookie `NEXT_LOCALE`, sans changement d'URL).
- Bascule de **thème clair / sombre**.

**Socle technique**

- Monorepo pnpm + Turborepo, Next.js 16 (App Router), Supabase Postgres avec **RLS sur toutes les tables**, Google Sheets comme source de vérité V0 synchronisée dans Postgres.

> Guide d'utilisation détaillé (membres & trésoriers) : [`docs/GUIDE_UTILISATION.md`](./docs/GUIDE_UTILISATION.md).

## Prérequis

- Node 20+ (`nvm use 20` ou `fnm use 20`)
- pnpm 9+ (`corepack enable && corepack prepare pnpm@latest --activate`)

## Quick start

```bash
pnpm install          # Installe tous les workspaces
pnpm dev              # Lance vitrine (:3000) + web (:3001) via Turborepo
```

## Commandes principales

```bash
# Développement
make dev              # turbo dev (tous les workspaces)
make dev-web          # apps/web seul sur :3001
make dev-vitrine      # apps/vitrine seul sur :3000
make storybook        # Storybook packages/ui sur :6006

# Qualité (lancer les trois avant de push)
make lint             # turbo lint
make typecheck        # turbo typecheck
make test             # turbo test

# Base de données locale (Supabase CLI — pas Docker)
make db-start         # supabase start
make db-migrate       # supabase db push
make db-reset         # ⚠ destructif — wipe DB locale
make db-types         # regénère packages/data/src/supabase/types.gen.ts
```

## Contributing

Voir [CONTRIBUTING.md](./CONTRIBUTING.md) pour les conventions de commits, branches et tokens design.

Format de commit : `type(scope): description`  
Scopes valides : `web | vitrine | ui | design-system | data | types | utils | supabase | sheets | infra | ci`

## Architecture

- **Vitrine** : Next.js 15 statique, déployée sur GitHub Pages via `.github/workflows/deploy-vitrine.yml`. **Jamais refactorisée.**
- **App web** : Next.js 16 App Router, auth Supabase magic link, TanStack Query v5, port 3001.
- **Design system** : CSS custom properties (`:root` light / `[data-theme="dark"]`) + bloc Tailwind V4 `@theme {}`. Jamais de hex en dur dans les composants.
- **Google Sheets** : source de vérité en V0, synchronisée dans Supabase Postgres toutes les 2h via Edge Function.

## Licence

MIT
