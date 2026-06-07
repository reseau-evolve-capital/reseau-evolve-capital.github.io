# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working language

**Français par défaut.** La doc archi, les tickets, les messages de commit, les commentaires de code et le copy UI sont en français ; les PRD et tokens design utilisent du copy FR.

**⚠ Pas de « FR-only ».** L'app membre `apps/web` doit être **internationalisable (i18n)**, avec le **français comme langue par défaut**. Une string en anglais n'est donc pas un bug en soi ; le vrai défaut est l'absence d'i18n ou un écran non traduit/non brandé (ex. : afficher une `not-found.tsx` FR custom plutôt que la page 404 Next par défaut en anglais). La mise en place de l'i18n proprement dite est un **ticket follow-up** (non bloquant pour les corrections en cours).

## Light / Dark & source de vérité visuelle

La source de vérité visuelle vit dans `REC/standalone-exports/*.html` (auto-suffisants, servir via `python3 -m http.server 8770`). **La plupart de ces fichiers ont un toggle LIGHT/DARK** (en haut de page et/ou intégré à chaque écran de connexion — ils pilotent le même état). Lors de tout **audit ou contrôle visuel** « rendu vs réf », **penser à basculer light ET dark** avant de conclure (sinon faux positifs : un écran capturé par défaut peut être dans l'autre thème). Le détail des écrans ↔ routes vit dans `docs/audits/design-reference-map.md` (artefact persistant).

## Repository state — read this first

Ce dépôt est dans un état **bicéphale** :

1. **Branche `main`** : la **vitrine légacy** Next.js 14 statique, déployée sur GitHub Pages via le domaine `reseauevolvecapital.com` (voir `CNAME`). C'est le site public actuel. Elle utilise Next.js + i18n FR/EN, formulaires `contact.js` et `newsletter.js` reliés à un Apps Script (`Code.gs`), contenu MD dans `content/`. **NE JAMAIS REFACTORER cette vitrine.** Toute modification sur `main` doit être chirurgicale (fix typo, mise à jour de contenu) — pas de migration de stack, pas de réécriture.

2. **Branche `feat/monorepo`** (à créer si elle n'existe pas encore via `FND-001`) : c'est là qu'atterrit **tout le travail post-Sprint 0**. Le plan est de transformer ce repo en monorepo pnpm + Turborepo avec `apps/vitrine` (la vitrine actuelle, déplacée sans refacto) + `apps/web` (la nouvelle app membre) + 5 packages partagés. La branche ne merge sur `main` qu'une fois Sprint 0 complet, conformément au `MIGRATION_PLAN.md` (étape 11). En attendant, `main` reste l'unique source déployée.

**Le Sprint 0 (POC-001) est déjà fait.** Le POC validé vit dans le dépôt voisin `REC` (`/Users/lionel/Documents/OMNIVENTUS/Projects/REC/sandbox/poc-sheets/`) — il est mappé en working dir additionnel (`./.claude/settings.local.json`). Tu peux le **référencer** pour réutiliser la logique d'auth Google Sheets et les mappers DTO, mais **ne le réimporte pas en l'état** dans le monorepo : il a été conçu jetable. Le code définitif vit dans `packages/data/src/sheets/` (créé par les tickets `SHE-*`).

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

## Commandes (post-FND-001)

Ces commandes fonctionnent une fois Sprint 1 (FND-001) terminé. Avant ça, elles échouent avec "no workspace".

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
make db-sync                              # sync manuel Sheets → Postgres

# E2E
pnpm --filter @evolve/web playwright test
```

`docker-compose.yml` ne doit contenir **que le service `web`** — la stack Supabase locale tourne via la CLI Supabase, pas via un container `postgres:15` brut. Correction explicite du `TECH_REVIEW.md` §3.1.

## Conventions non-négociables

Issues de `ARCHITECTURE.md` §7, `TECH_REVIEW.md`, `Phase2_Handoff/00_README.md` §7. Toute remise en cause demande validation explicite de l'utilisateur.

- **La vitrine ne casse jamais.** La migration est additive — pas de refacto sur `apps/vitrine`. Tant que la branche `feat/monorepo` n'est pas mergée, `main` doit pouvoir builder et déployer comme avant.
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

**Sur la branche `main` (légacy)** : conserver le format existant `TASK($TASK_ID): description` (extrait de la branche), conformément à `.cursorrules`. Ne pas casser cette convention historique.

**Sur la branche `feat/monorepo` et toute branche `feat/*` du monorepo** : Conventional Commits avec ces scopes uniquement :

```
<type>(<scope>): <description>

scope ∈ { web | vitrine | cms | ui | design-system | data | types | utils | supabase | sheets | infra | ci }
```

Husky + commitlint rejettent tout le reste (config dans FND-004). Ces hooks ne sont pas encore en place — ils arrivent dans Sprint 0/1 du monorepo.

## Variables d'environnement

Définies et scopées dans `REC/ARCHITECTURE.md` §8. Les deux pièges récurrents :

- **`SHEET_ID` n'existe pas comme env var de production.** Les `sheet_id` par club vivent dans `clubs.sheet_id` en Postgres. (Exception : le POC `REC/sandbox/poc-sheets/` utilise une env var SHEET_ID parce qu'il est jetable.)
- **`SUPABASE_SERVICE_ROLE_KEY` est server-only**, utilisée uniquement dans `supabase/functions/`. Jamais shippée au client ; jamais référencée depuis du code browser de `apps/web`. La paire `NEXT_PUBLIC_SUPABASE_*` est ce que le client utilise.

## État Git au moment de la session

`main` est suivie sur GitHub Pages. La branche `feat/monorepo` n'existe peut-être pas encore — la créer via `FND-000` (préparation) puis `FND-001` (scaffolding monorepo + déplacement de la vitrine dans `apps/vitrine`). Tant que la branche n'est pas mergée, **ne touche pas à `main`** sauf pour des corrections critiques de la vitrine.

Avant toute action destructive sur des fichiers de la vitrine (`content/`, `contact.js`, `newsletter.js`, `Code.gs`, `marketing/`, `messages/`, `next.config.ts`, `Dockerfile`), confirme avec l'utilisateur — ces fichiers tournent en production.
