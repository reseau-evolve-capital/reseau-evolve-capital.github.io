# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Approach

- Read existing files before writing. Don't re-read unless changed.
- Thorough in reasoning, concise in output.
- No sycophantic openers or closing fluff.
- No emojis or em-dashes.
- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.

## Output

- Return code first. Explanation after, only if non-obvious.
- No inline prose. Use comments sparingly - only where logic is unclear.
- No boilerplate unless explicitly requested.

## Code Rules

- Simplest working solution. No over-engineering.
- No abstractions for single-use operations.
- No speculative features or "you might also want..."
- Read the file before modifying it. Never edit blind.
- No docstrings or type annotations on code not being changed.
- No error handling for scenarios that cannot happen.
- Three similar lines is better than a premature abstraction.

## Review Rules

- State the bug. Show the fix. Stop.
- No suggestions beyond the scope of the review.
- No compliments on the code before or after the review.

## Debugging Rules

- Never speculate about a bug without reading the relevant code first.
- State what you found, where, and the fix. One pass.
- If cause is unclear: say so. Do not guess.

## Simple Formatting

- No em dashes, smart quotes, or decorative Unicode symbols.
- Plain hyphens and straight quotes only.
- Natural language characters (accented letters, CJK, etc.) are fine when the content requires them.
- Code output must be copy-paste safe.

## Working language

**Français par défaut.** La doc archi, les tickets, les messages de commit, les commentaires de code et le copy UI sont en français ; les PRD et tokens design utilisent du copy FR.

**⚠ Pas de « FR-only ».** L'app membre `apps/web` doit être **internationalisable (i18n)**, avec le **français comme langue par défaut**. Une string en anglais n'est donc pas un bug en soi ; le vrai défaut est l'absence d'i18n ou un écran non traduit/non brandé (ex. : afficher une `not-found.tsx` FR custom plutôt que la page 404 Next par défaut en anglais). La mise en place de l'i18n proprement dite est un **ticket follow-up** (non bloquant pour les corrections en cours).

## Light / Dark & source de vérité visuelle

La source de vérité visuelle vit dans `REC/standalone-exports/*.html` (auto-suffisants, servir via `python3 -m http.server 8770`). **La plupart de ces fichiers ont un toggle LIGHT/DARK** (en haut de page et/ou intégré à chaque écran de connexion — ils pilotent le même état). Lors de tout **audit ou contrôle visuel** « rendu vs réf », **penser à basculer light ET dark** avant de conclure (sinon faux positifs : un écran capturé par défaut peut être dans l'autre thème). Le détail des écrans ↔ routes vit dans `docs/audits/design-reference-map.md` (artefact persistant).

## Mandatory quality gate — `/codebase-quality-auditor` (HARD)

**Trigger:** any feature creation or update, or any meaningful dev work that adds or changes at least
one component, function, method, constant, hook, or route handler.

**Before declaring work done — non-negotiable:**

1. Run `/codebase-quality-auditor`.
2. Fix every finding **linked to your work** (files you touched, patterns you introduced).
3. Re-run the audit. **Loop** until zero findings remain that are attributable to your work.
4. Do **not** report completion until this loop passes. Green tests + webpack smoke are necessary but
   **not sufficient**.

Out-of-scope pre-existing findings may be noted but do not block completion. Findings caused by your
diff always block.

## Repository state — read this first

**La migration monorepo est terminée.** `main` est la branche de travail et d'intégration par défaut.

| Élément             | État actuel                                                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`main`**          | Monorepo pnpm + Turborepo : `apps/vitrine` + `apps/web` + `apps/cms` (Strapi, yarn) + 5 packages `@evolve/*` + `supabase/`                                                                   |
| **Vitrine live**    | Déployée depuis la branche **`gh-pages`** (GitHub Pages) → `reseauevolvecapital.com`. Code source dans `apps/vitrine/`. **Ne jamais refactorer** la vitrine — fixes chirurgicaux uniquement. |
| **`feat/monorepo`** | Branche **historique** de migration (FND-000 → merge PR #16). **Obsolète** — ne plus l'utiliser comme cible ; brancher les features depuis `main` (`feat/*`, `fix/*`).                       |
| **App membre**      | `apps/web` → Vercel. Développement local `:3001`.                                                                                                                                            |

**POC Sheets (POC-001)** : le jetable validé vit dans `REC/sandbox/poc-sheets/` — référence uniquement. Le code définitif est dans `packages/data/src/sheets/` (tickets `SHE-*`).

## Source-of-truth documents

Toute la doc d'architecture et le backlog vivent dans le dépôt voisin `REC/` (mappé en working dir additionnel). Référence-les par leur chemin absolu :

| Question                                                            | Fichier                                                                                                                                |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Layout monorepo prévu ?                                             | `/Users/lionel/Documents/OMNIVENTUS/Projects/REC/ARCHITECTURE.md` §1                                                                   |
| Versions exactes des libs / justifications ?                        | `/Users/lionel/Documents/OMNIVENTUS/Projects/REC/TECH_STACK.md`                                                                        |
| Comment passer de l'état actuel → monorepo sans casser la vitrine ? | `/Users/lionel/Documents/OMNIVENTUS/Projects/REC/MIGRATION_PLAN.md` (11 étapes, FND-000 → FND-007)                                     |
| Schéma Postgres, modèle RLS, mapping sheet → DTO ?                  | `/Users/lionel/Documents/OMNIVENTUS/Projects/REC/DATA_MODEL.md`                                                                        |
| Quels arbitrages / contradictions ont été tranchés sur le backlog ? | `/Users/lionel/Documents/OMNIVENTUS/Projects/REC/TECH_REVIEW.md` (v2.0.0)                                                              |
| 12 sprints / ~85 tickets ?                                          | `/Users/lionel/Documents/OMNIVENTUS/Projects/REC/backlog/BACKLOG_00_OVERVIEW.md` + `backlog/BACKLOG_E-*.md`                            |
| À quoi ressemble chaque écran / que fait-il ?                       | `/Users/lionel/Documents/OMNIVENTUS/Projects/REC/Phase2_Handoff/docs/screens/0[1-5]_*.md`                                              |
| Tokens design, palette, catalogue de composants                     | `/Users/lionel/Documents/OMNIVENTUS/Projects/REC/Phase2_Handoff/docs/design.md` + `Phase2_Handoff/claude_design_session_01/tokens.css` |
| POC Sheets validé (référence)                                       | `/Users/lionel/Documents/OMNIVENTUS/Projects/REC/sandbox/poc-sheets/`                                                                  |

**Quand une tâche référence un ticket `*-XXX`** (ex: `FND-001`, `SHE-004`, `DSH-002`), le ticket vit dans `REC/backlog/BACKLOG_E-<EPIC>.md` et contient une spec-as-prompt complète. Lis-la avant de coder — elle a les critères d'acceptation, les chemins de fichiers à toucher, et les stories Storybook attendues.

## Architecture en une phrase

`apps/vitrine` (la vitrine existante → GitHub Pages, **jamais refacto**) et `apps/web` (nouvelle Next.js 16 App Router → Vercel) consomment 5 packages internes : `@evolve/ui` (composants React atomiques + Storybook), `@evolve/design-system` (Tailwind V4 `@theme {}` CSS + tokens TS, **zéro dépendance React**), `@evolve/types`, `@evolve/data` (clients Supabase + Google Sheets avec mappers DTO stricts), `@evolve/utils`. Supabase Postgres + Edge Functions côté back ; Sheets est source de vérité en V0 et est mirroré dans Postgres par une Edge Function `sync` déclenchée par `pg_cron` toutes les 2h.

`packages/ui` ne dépend **jamais** de `packages/data`. `apps/web/components/` héberge tout ce qui a de la logique métier (hooks Supabase, Server Actions) ; les composants présentationnels réutilisables vont dans `packages/ui`.

## Commandes

```bash
# Day-to-day
make dev                                  # turbo dev sur tous les workspaces
make dev-web                              # apps/web seul sur :3001
make dev-vitrine                          # apps/vitrine (la légacy déplacée)
make storybook                            # Storybook packages/ui
pnpm --filter @evolve/web dev             # équivalent à dev-web

# Qualité (les trois avant de push)
make lint typecheck test
pnpm turbo test --filter=@evolve/ui       # un seul workspace
pnpm vitest run path/to/file.test.ts      # un seul fichier

# Supabase (stack locale via Supabase CLI, PAS docker-compose postgres)
make db-start                             # supabase start
make db-migrate                           # supabase db push
make db-reset                             # ⚠ destructif — wipe DB locale
make db-types                             # regénère packages/data/src/supabase/types.gen.ts
make db-functions-serve                   # sert les Edge Functions (lit .env.local si présent, sinon .env)
make db-sync CLUB_ID=<uuid>               # sync manuel Sheets → Postgres (Edge servie requise)

# E2E
pnpm --filter @evolve/web playwright test
```

### Données de test locales (matrice DEMO)

**Pour tester une feature en local, si la DB n'a pas de données suffisantes** (le seed `supabase/seed.sql` est minimal — un seul Club E2E vide), **pomper la matrice DEMO** via le vrai pipeline de sync : c'est ce qui donne des données prod-like ET révèle les divergences réelles (cotisations `paid` sans `paid_at`, transactions à date NULL, solde d'ouverture absent du legacy…).

```bash
make db-functions-serve                   # terminal séparé — sert l'Edge sync avec la SA DEMO
make db-reset                             # ⚠ wipe local
SRK="$(supabase status -o env | grep '^SERVICE_ROLE_KEY' | cut -d= -f2 | tr -d '\"')"
SUPABASE_SERVICE_ROLE_KEY="$SRK" make db-set-sheet CLUB_ID=aaaaaaaa-0000-0000-0000-000000000001
SUPABASE_SERVICE_ROLE_KEY="$SRK" make db-sync       CLUB_ID=aaaaaaaa-0000-0000-0000-000000000001
```

- **Convention `.env.local`** : la matrice DEMO (SA `rec-poc@rec-poc-497900…`, `SHEET_ID`, `GOOGLE_SA_KEY_BASE64`) vit dans `supabase/functions/.env.local` (gitignored), qui **prime sur `.env`**. La CLI Supabase n'a PAS la convention `.env.local` de Next.js → c'est `make db-functions-serve` qui sélectionne le bon `--env-file`, et `scripts/set-sheet-id.mjs` lit aussi `.env.local`. Sheet id DEMO : `1aP_7MihrpZpYlfhaJ7RcAqpnNAtB9eanhibSiQEldlI`.
- **Emails de la DEMO anonymisés** (aucun risque de contacter un vrai membre). Mais le repo est **PUBLIC** : ne jamais committer un dump de ces données (noms/montants = PII) — `.gitignore` interdit déjà `*.dump`/`*.sql.gz`. Les données restent en DB locale.

`docker-compose.yml` ne doit contenir **que le service `web`** — la stack Supabase locale tourne via la CLI Supabase, pas via un container `postgres:15` brut. Correction explicite du `TECH_REVIEW.md` §3.1.

## Conventions non-négociables

Issues de `ARCHITECTURE.md` §7, `TECH_REVIEW.md`, `Phase2_Handoff/00_README.md` §7. Toute remise en cause demande validation explicite de l'utilisateur.

- **La vitrine ne casse jamais.** Pas de refacto sur `apps/vitrine`. Le site public (`gh-pages`) ne se redéploie que via `make vitrine-export` / workflow vitrine — un merge sur `main` ne casse pas le live.
- **RLS activée sur toutes les tables dès la migration 0001.** Aucune table joignable sans policy. Helpers `get_user_club_ids()` et `get_user_role_in_club()` en `SECURITY DEFINER STABLE` pour éviter les récursions sur `memberships`.
- **Le multi-club passe par `clubs.sheet_id` en DB, pas par env vars.** L'Edge Function `sync` reçoit `club_id` et lookupe la matrice. Un seul service account Google (`GOOGLE_SA_KEY_BASE64`) est partagé avec la matrice de chaque club.
- **La feuille `Base` s'importe en premier** (sa colonne email est la clé de matching vers `users.email`). Les autres feuilles référencent les membres par nom et reposent sur Base déjà importée.
- **Pattern DTO strict.** Chaque ligne Google Sheets a un `*RowDTO` (brut, tous `string | null`) dans `packages/data/src/sheets/`, et un mapper dans `mappers/` qui produit un type métier. Un changement de structure de la Sheet ne touche que le mapper.
- **La valorisation live est calculée côté frontend.** La DB stocke `quantity` + `symbol` ; le client appelle une API de marché et calcule `live_value = quantity * live_price`. **Ne pas** ajouter de chemin de sync pour les prix intraday. Voir `PFT-007` pour l'abstraction `PriceProvider`.
- **Tailwind V4 est CSS-first.** Pas de `tailwind.config.ts`. Le theme vit dans `packages/design-system/styles/theme.css` dans un bloc `@theme { … }`. Les apps consomment via `@import "@evolve/design-system/styles/index.css"`. Jamais de hex codés en dur dans les composants — utiliser les classes générées (`bg-brand-yellow-500`, `text-data-negative-500`, etc.).
- **Le rouge brand `#E93E3A` est exclusivement branding — jamais pour indiquer une perte.** Perte / delta négatif = token dataviz `--color-data-negative-500` (`#C53030`). Le composant `TrendBadge` doit faire respecter cette règle.
- **Le formatage monnaie et pourcentage passe par `@evolve/utils`.** `formatEUR()` produit `1 234,56 €` (locale FR, NBSP). Jamais d'appel direct à `toLocaleString` sur des valeurs monétaires. Même règle pour `formatPct()` et `formatDate()`.
- **Jamais de `NaN`, `undefined`, ou crash vide à l'écran.** Chaque composant a un état `error` et un état `empty` explicites — fallback sur `—`, `EmptyState`, ou `ErrorBoundary`. Voir `design.md` §8.
- **A11y AA mini, AAA sur les chiffres-clés** (quote-part, variation). Focus visible (`shadow.glow`) sur chaque interactif, cibles tactiles ≥ 44×44px sur mobile, navigation clavier complète, `prefers-reduced-motion` respecté. Chaque composant interactif a un test `jest-axe` ; Lighthouse CI cible ≥ 90.
- **TypeScript strict.** `strict: true`, `noUncheckedIndexedAccess: true`. Zéro `any`. Tout `@ts-ignore` exige un commentaire `// reason: …`.

### ♿ Accessibilité & curseur

- **`cursor: pointer` sur TOUT élément cliquable.** Couvert **globalement** par la règle `@layer base` du design-system (`packages/design-system/styles/index.css`) — `cursor: pointer` sur les interactifs (`button`, `[role="button"]`, `a[href]`, `label`, `summary`, `select`, etc.), `cursor: not-allowed` sur `[disabled]`/`[aria-disabled="true"]`. **Ne jamais y déroger avec un `cursor` en dur** dans un composant. Raison : le preflight Tailwind v4 ne pose plus `cursor: pointer` sur `<button>` (régression RGAA 3.3 / UX, cf. `R-035`).
- **Tout cliquable non-`<button>`/`<a>`** (ex. `<div onClick>`) DOIT avoir **simultanément** `role="button"` + `tabIndex={0}` + un `onKeyDown` (Enter/Espace) — c'est ce qui le rend focusable, activable au clavier ET couvert par la règle pointer.

  ```tsx
  // ✅
  <div role="button" tabIndex={0} onClick={open} onKeyDown={onActivate}>…</div>
  // ❌ — pas focusable, pas de clavier, pas de pointer
  <div onClick={open}>…</div>
  ```

- **Après tout changement sur des composants interactifs**, lancer
  `pnpm --filter @evolve/web exec playwright test cursor-pointer.spec.ts --workers=1` → **0 échec** avant commit (le spec scanne les routes et échoue, message verbeux, si un cliquable n'a pas `cursor: pointer`).

## Stratégie de tests (ordre de priorité)

Choisir la couche la plus basse qui couvre vraiment le comportement. 4 couches :

1. **Tests d'interaction — Storybook 10 `play` functions** (par défaut pour `packages/ui`). Vrais événements utilisateur (click, clavier, focus). Contrat principal des composants UI.
2. **Tests unitaires — Vitest + @testing-library** (`packages/utils`, mappers `packages/data`, gardes `packages/types`). Logique pure, edge cases sur les parsers (ex: `parseFrDate("01/06/2018")`).
3. **A11y — `jest-axe` dans Vitest + Lighthouse CI**. Tous les composants interactifs, toutes les pages.
4. **E2E — Playwright** dans `apps/web`. Réservé aux flows irréversibles : login (magic link), chargement dashboard, vue portefeuille, cotisations.

Le skill `component-test-writer` (`/component-test-writer`) suit ce layering — l'invoquer pour écrire des tests.

## Orchestration des sprints / tickets majeurs

**Tout sprint (E-\*) ou ticket majeur (multi-fichiers, multi-couches) se traite en mode ORCHESTRATEUR**, pas en solo. Le lead **décompose, dispatche des sub-agents** (Agent tool), fait tourner une boucle **dev → test → QA → fix par ticket**, et **arbitre** — il ne code pas lui-même les features. Principe non négociable pour tenir le niveau de qualité habituel.

- **Phase 0 obligatoire** : lire les sources de vérité (CLAUDE.md, `REC/backlog/BACKLOG_E-*.md`, DATA_MODEL, exports visuels `REC/standalone-exports/*` servis sur `:8770`), **auditer l'état réel du code** (les backlogs sont parfois périmés : vérifier ce qui est déjà fait / chemins / services), lancer le **gate baseline**, puis **présenter le plan ordonné AVANT de lancer les implémenteurs**.
- **Roster** : PLANNER (read-only, plan + ancres/critères adaptés) → IMPLEMENTER (TDD, gate du workspace vert) → QA/SÉCURITÉ (scorecard : fonctionnel + visuel light/dark + RGAA/sécurité, **vérif RUNTIME**, max 3 itérations) → ARBITER (le lead tranche et logge les divergences vs backlog).
- **Parallélise l'indépendant, sérialise les ressources partagées** (mêmes fichiers : `next.config.ts`, `layout.tsx`, barrels, `types.gen.ts`, numéros de migration → assigner explicitement, câbler les barrels soi-même).
- **Gate « fait »** : critères d'acceptation OK + `make lint typecheck test` vert (preuve réelle) + tests de la couche touchée (`@evolve/ui`, e2e workers:1) + **rendu runtime light & dark + check i18n EN + parité fr/en** + doc/`design-reference-map` à jour. Gate vert ≠ conforme : la preuve, c'est le rendu/headers observés.
- **Commits FR atomiques par ticket**, **push uniquement sur demande**. Logger les arbitrages dans `docs/audits/design-reference-map.md` (artefact persistant) ou la doc du sprint.
- **Référence** : prompt orchestrateur type dans `docs/tickets/PROMPT-DEV-E-*.md` (ex. `PROMPT-DEV-E-OPS.md`) — réutiliser cette structure pour cadrer un nouveau sprint.

## Format de commit

**Monorepo (`main` et branches `feat/*` / `fix/*`)** : Conventional Commits avec ces scopes uniquement :

```
<type>(<scope>): <description>

scope ∈ { web | vitrine | cms | ui | design-system | data | types | utils | supabase | sheets | infra | ci }
```

Husky + commitlint (FND-004) rejettent tout le reste. Le format historique `TASK($TASK_ID): description` (`.cursorrules`) ne s'applique plus qu'aux branches legacy pré-monorepo si elles existent encore localement.

## Variables d'environnement

Définies et scopées dans `REC/ARCHITECTURE.md` §8. Les deux pièges récurrents :

- **`SHEET_ID` n'existe pas comme env var de production.** Les `sheet_id` par club vivent dans `clubs.sheet_id` en Postgres. (Exception : le POC `REC/sandbox/poc-sheets/` utilise une env var SHEET_ID parce qu'il est jetable.)
- **`SUPABASE_SERVICE_ROLE_KEY` est server-only**, utilisée uniquement dans `supabase/functions/`. Jamais shippée au client ; jamais référencée depuis du code browser de `apps/web`. La paire `NEXT_PUBLIC_SUPABASE_*` est ce que le client utilise.

## État Git au moment de la session

**Branche par défaut : `main`** (monorepo). Nouvelles features : `feat/*` ou `fix/*` depuis `main`, PR vers `main`. CI : push sur `main` + PR vers `main` (`.github/workflows/ci.yml`).

Avant toute action destructive sur `apps/vitrine/` (contenu, formulaires, déploiement GitHub Pages), confirme avec l'utilisateur — la vitrine tourne en production sur `reseauevolvecapital.com`.

<!-- rtk-instructions v2 -->

# RTK (Rust Token Killer) - Token-Optimized Commands

#if it's not working, you may have to install it curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:

```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)

```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)

```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)

```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)

```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)

```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)

```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)

```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)

```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)

```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands

```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category         | Commands                       | Typical Savings |
| ---------------- | ------------------------------ | --------------- |
| Tests            | vitest, playwright, cargo test | 90-99%          |
| Build            | next, tsc, lint, prettier      | 70-87%          |
| Git              | status, log, diff, add, commit | 59-80%          |
| GitHub           | gh pr, gh run, gh issue        | 26-87%          |
| Package Managers | pnpm, npm, npx                 | 70-90%          |
| Files            | ls, read, grep, find           | 60-75%          |
| Infrastructure   | docker, kubectl                | 85%             |
| Network          | curl, wget                     | 65-70%          |

Overall average: **60-90% token reduction** on common development operations.

<!-- /rtk-instructions -->
