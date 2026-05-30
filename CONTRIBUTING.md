# Contributing to Evolve Capital

## Setup local

1. Cloner le repo
2. `nvm use 20` (ou `fnm use 20`)
3. `pnpm install` — installe tous les workspaces
4. `pnpm dev` — lance Turborepo (vitrine :3000 + web :3001)

## Branches et PRs

- Feature : `feat/<description>`
- Bugfix : `fix/<description>`
- Toujours PR vers `main`

## Commits (Conventional Commits)

Format : `type(scope): message`

**Types** : feat, fix, docs, style, refactor, perf, test, chore, ci
**Scopes** : web, vitrine, ui, design-system, data, types, utils, supabase, sheets, infra, ci

Exemples :

- `feat(web): add member dashboard`
- `fix(design-system): button focus ring color`
- `chore(infra): update pnpm lockfile`

## Qualité

- ESLint + Prettier — auto-corrigés au commit via lint-staged
- TypeScript strict (`strict: true`, `noUncheckedIndexedAccess: true`)
- Zéro `any`

## Tests

- Composants UI : Storybook 10 + `play()` functions
- Logique pure : Vitest
- A11y : jest-axe
- Flows critiques : Playwright E2E

## Consommer les tokens design

### Hiérarchie des sources

1. **Source de vérité** = `packages/design-system/styles/tokens.css` (CSS custom properties)
2. **Couche Tailwind** = `packages/design-system/styles/theme.css` (bloc `@theme {}`)
3. **Couche TypeScript** = `packages/design-system/src/tokens/index.ts` (miroir typé)

### Quel canal pour quel usage

| Contexte              | Canal             | Exemple                                                |
| --------------------- | ----------------- | ------------------------------------------------------ |
| Composant React       | Classes Tailwind  | `bg-brand-yellow`, `text-data-negative`, `shadow-card` |
| CSS local (rare)      | CSS var directe   | `color: var(--data-negative)`                          |
| Calcul JS / Storybook | Import TypeScript | `import { dataViz } from '@evolve/design-system'`      |

### 4 règles non-négociables

1. `--brand-red` (#E93E3A) = branding uniquement — **jamais pour une perte**. Perte → `--data-negative` (#C53030). Vérifié en CI.
2. Toute valeur monétaire passe par `formatEUR()` de `@evolve/utils`. **Jamais** `toLocaleString()`.
3. Toute animation honore `prefers-reduced-motion: reduce` — utiliser les variants `motion-reduce:` Tailwind.
4. Tout composant interactif a un état `error` et `empty` — fallback `—`, `EmptyState`, ou `ErrorBoundary`.

### Checklist PR (composants UI)

- [ ] Classes Tailwind des tokens (pas de hex en dur) — vérifié en CI
- [ ] `prefers-reduced-motion` respecté sur toutes les animations
- [ ] `jest-axe` vert sur chaque composant interactif
- [ ] Stories Storybook : default + hover + focus + disabled + error + empty
- [ ] Light mode ET dark mode (`[data-theme="dark"]`) vérifiés visuellement
