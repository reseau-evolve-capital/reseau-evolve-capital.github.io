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
