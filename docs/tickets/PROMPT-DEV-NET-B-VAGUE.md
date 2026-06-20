# Prompt d'orchestration — Vague NET-B+ (« Console réseau & améliorations »)

> **À coller dans une nouvelle session Claude Code.** Working dir : `/Users/lionel/Documents/OMNIVENTUS/Projects/reseau-evolve-capital` (+ working dir REC voisin). Branche de travail : **créer `feat/net-b-vague` depuis `main` à jour** (NE travaille PAS sur `main`). Date audit : 2026-06-21.

---

Tu ES le **LEAD / ORCHESTRATEUR** de cette vague. Tu **décomposes, dispatches des sub-agents, fais tourner une boucle dev → test → QA → fix par ticket, et arbitres**. Tu ne codes pas les features toi-même. Principe non négociable (cf. `CLAUDE.md` §« Orchestration des sprints »).

## 0. CADRE & GARDE-FOUS (non négociables)

- **Langue FR** : doc, tickets, commits, commentaires, copy UI. App `apps/web` **internationalisable**, FR par défaut (next-intl cookie `NEXT_LOCALE`) — vérifier **parité fr/en** sur toute copy touchée.
- **Branche** : `feat/net-b-vague` depuis `main`. **Commits FR atomiques par ticket** (Conventional Commits, scopes `web|ui|data|supabase|…`). **Push uniquement sur demande de l'owner**, sur la **branche dédiée** (jamais `main`). ⚠ **Vérifie `git branch --show-current` avant CHAQUE commit** (incident connu : un commit a déjà dérivé sur `main` / sur le repo REC — sois explicite).
- **Tokens design uniquement**, jamais de hex en dur. **Rouge brand `#E93E3A` = branding seul** ; statut négatif / action destructive / sévérité → `--color-data-negative-500 (#C53030)`. `data-warning` / `data-positive` pour le reste.
- **TypeScript strict**, zéro `any`, `noUncheckedIndexedAccess`. **A11y RGAA AA** (AAA chiffres-clés), `cursor: pointer` sur tout cliquable, cibles ≥ 44×44 px.
- **Sécurité** : mutations via **RPC `SECURITY DEFINER` gardées** (jamais de service-role côté UI hors Edge). On **n'élargit pas** les policies RLS club existantes. **RLS activée** sur toute table créée.
- **La vitrine ne casse jamais** (hors périmètre ici).
- **Gotchas connus** : polices MADE Tommy Soft gitignorées (build CI stub) ; pas de RTL dans `apps/web` ; **e2e `--workers=1`** + seed propre (`make db-reset`) sinon dérive ; port 3001 parfois squatté (fallback 3011) ; commitlint refuse sujet > ~100 car. et exige minuscule.

## 1. SOURCES DE VÉRITÉ (lire AVANT de planifier)

- **Backlog consolidé de la vague** : `REC/backlog/BACKLOG_E-NET.md` → **Sprint NET-B (NET-008→015)** + **Sprint NET-B+ (NET-018, 019, 020 · ADM-008, 009 · OPS-006, 007 · NAV-001 · PWA-002)**. C'est LA liste de tickets (spec-as-prompt complète chacun).
- **Retour de réflexion** (contexte/arbitrages owner) : `docs/product/RETOUR-REFLEXIONS-2026-06-20.md`.
- **Sous-prompts design** : `docs/product/PROMPT-DESIGN-feedback-console.md`, `docs/product/PROMPT-DESIGN-gestion-roles-clubs.md`.
- **PRD réseau** : `docs/product/PRD-NETWORK-ADMIN.md` (cockpit, zones, nav).
- **Carte écran↔route** : `docs/audits/design-reference-map.md` (§ Vague NET-B+ + § NET-A).
- **Maquettes (source de vérité visuelle)** : `REC/standalone-exports/` →
  - `Reseau - Retours (standalone).html` → NET-019, ADM-009.
  - `Reseau - Roles & Statuts (standalone).html` → NET-018, NET-020, ADM-008, NAV-001.
  - `Reseau - Administration (standalone).html` → contexte NET-007/cockpit (NET-B core).
- **QA** : `docs/qa/FLOWS.md`, `REGRESSIONS.md` (R-001→R-035), `VISUAL.md`, `RGAA.md`.
- **DATA_MODEL** : `REC/DATA_MODEL.md`. **Gate** : `Makefile`, `.github/workflows/ci.yml`.

## 2. PÉRIMÈTRE & MAPPING ticket ↔ écran ↔ maquette

| Ticket      | Écran / route                               | Maquette de référence (écran)         | Migration ?                                        |
| ----------- | ------------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| **NET-018** | `/reseau/clubs/[id]` § Statut + liste clubs | `Roles & Statuts` 01–02               | oui (`clubs.is_active`) + helper + RPC             |
| **NET-019** | `/reseau/retours` + détail                  | `Retours` 01/01-B/03                  | oui (`feedback.club_id` + RLS)                     |
| **NET-020** | `/reseau/bureau` (write)                    | `Roles & Statuts` 04                  | non (RPC existent)                                 |
| **ADM-008** | `/admin/membres` éditeur rôle               | `Roles & Statuts` 03                  | oui (`memberships.role_source`) + RPC + garde sync |
| **ADM-009** | `/admin/retours`                            | `Retours` 02/03                       | non (réutilise NET-019)                            |
| **OPS-006** | retrait Cloudflare                          | — (technique)                         | non                                                |
| **OPS-007** | socle `withAudit()`                         | — (technique)                         | oui (`audit_log` append-only)                      |
| **NAV-001** | menu avatar + sélecteur club                | `Roles & Statuts` 05                  | non                                                |
| **PWA-002** | `loading.tsx` skeleton                      | — (réutilise `dashboard/loading.tsx`) | non                                                |

> **Note NET-B core** : si l'audit Phase 0 montre que NET-008→015 (cockpit/console/annuaire/events/votes réseau) n'est pas encore livré, le PLANNER l'**ordonne dans cette vague** (NET-020 dépend de l'écran Bureau NET-010 ; ADM-009 dépend de NET-019). Ne pas refaire ce qui est déjà fait.

> **Report explicite (NE PAS implémenter ici)** : le **digest IA agrégé** (panneau « Synthèse IA » des consoles feedbacks) reste en **NET-C / NET-017** — le rendre en carte **« Bientôt »**. Widget iOS & offline = hors vague (suivis).

## 3. PHASE 0 — OBLIGATOIRE (avant de lancer le moindre implémenteur)

1. **Lire** toutes les sources §1.
2. **Auditer l'état réel du code** (les backlogs périment) : `supabase/migrations/` (plage de numéros LIBRE réelle — NET-A est allé jusqu'à 049, vote/feedback ont consommé 036-038 ; **n'attribue les numéros qu'après vérification**), RPC `network_*` déjà présentes, état de NET-B core, `feedback` (036), `get_user_club_ids()`, `AppTopbar`/`AdminTabs`/sous-nav réseau.
3. **Servir les maquettes** : `cd "REC/standalone-exports" && python3 -m http.server 8770` ; ouvrir chaque standalone (light **et** dark).
4. **Gate baseline** (prouver le vert AVANT de toucher) : `make lint typecheck test`.
5. **Présenter le PLAN ordonné** (numéros de migration assignés, lots parallèles vs sérialisés, ressources partagées) **et attendre validation de l'owner AVANT de lancer les implémenteurs**.

## 4. ROSTER de sub-agents

- **PLANNER** (read-only) : plan par ticket, ancres de code, critères d'acceptation adaptés à l'état réel, identification des ressources partagées.
- **IMPLEMENTER** (un par ticket ou lot) : **TDD**, gate du workspace vert, respect tokens/i18n/a11y. Isolation worktree si écritures parallèles sur mêmes fichiers.
- **QA** : déclencher l'agent **`qa-orchestrator`** (qui dispatche `qa-unit`, `qa-e2e`, `qa-visual`, `qa-a11y`, puis `qa-reporter`). **Vérification RUNTIME obligatoire** ; **max 3 itérations** dev↔QA par ticket.
- **ARBITER** (toi, le lead) : tranche les divergences vs backlog, logge dans `docs/audits/design-reference-map.md`.

**Parallélise l'indépendant, sérialise les ressources partagées.** Ressources partagées de cette vague à assigner explicitement (un seul owner / sérialiser) :

- **Numéros de migration** (NET-018, NET-019, ADM-008, OPS-007) → attribuer en Phase 0.
- **`apps/web/next.config.ts`** (CSP) + **`apps/web/app/layout.tsx`** → OPS-006 seul.
- **Edge `supabase/functions/sync`** → NET-018 (garde club désactivé) **et** ADM-008 (non-réécriture rôle `manual`) : **sérialiser**.
- **`get_user_club_ids()`** (NET-018) : modif transverse RLS → test d'isolation obligatoire.
- **`packages/ui` `AppTopbar`** (NAV-001), **`AdminTabs`** (ADM-009), **sous-nav réseau** (NET-019/020) → câblage barrels par le lead.
- **`feedback` RLS + `lib/feedback/actions.ts`** (NET-019) puis ADM-009 → sérialiser.
- **`types.gen.ts`** : régénérer (`make db-types`) après chaque migration, owner unique.

## 5. BOUCLE PAR TICKET

1. **PLANNER** : plan + ancres visuelles (écran de maquette ciblé).
2. **IMPLEMENTER** : code TDD, fait passer le gate du workspace touché.
3. **`qa-orchestrator`** : croise `git diff` vs zones de vigilance (`REGRESSIONS.md`), dispatche les sous-agents QA, rend un **SCORECARD** (verdict ∈ {CONVERGÉ | À CORRIGER | ARBITRAGE REQUIS}).
4. Si **À CORRIGER** → deltas renvoyés à l'IMPLEMENTER, re-QA (**max 3 tours**).
5. Si **ARBITRAGE REQUIS** ou non-convergé après 3 tours → **ARBITER tranche** et **logge** la décision dans `design-reference-map.md`.

## 6. QUALITY GATE — définition de « FAIT » (preuves réelles exigées)

Un ticket est « fait » **uniquement** si TOUT ce qui suit est vrai et **prouvé** (sortie réelle, pas affirmée) :

**a) Gate vert** (workspaces touchés) :

```bash
make lint typecheck test
pnpm turbo test --filter=@evolve/ui       # si packages/ui touché (Storybook play + jest-axe)
pnpm turbo test --filter=@evolve/web      # actions/maps
```

**b) E2E Playwright** (`--workers=1` OBLIGATOIRE, seed propre) :

```bash
make db-reset
export SUPABASE_SERVICE_ROLE_KEY="$(supabase status -o env | grep -i service_role | cut -d= -f2 | tr -d '\"')"
pnpm --filter @evolve/web exec playwright test --workers=1 --reporter=line
# Spécifiques au périmètre : club-switcher.spec.ts (étendu mobile, NAV-001), admin.spec.ts, access.spec.ts, feedback.spec.ts, reseau.spec.ts
```

**c) A11y (0 violation bloquante)** :

```bash
pnpm --filter @evolve/web exec playwright test cursor-pointer.spec.ts --workers=1     # R-035, étendre aux nouvelles routes
pnpm --filter @evolve/web exec playwright test input-min-fontsize.spec.ts --workers=1 # anti-zoom iOS
pnpm --filter @evolve/web exec playwright test a11y.spec.ts access.spec.ts --workers=1
```

**d) Deno** (si `supabase/functions/` touché — NET-018, ADM-008) :

```bash
~/.deno/bin/deno test --no-check --allow-all --config supabase/functions/sync/deno.json supabase/functions/sync/__tests__/*.test.ts
```

⚠ Vigilance `REGRESSIONS.md` R-029/030/010 (sync rôles / network_admin / fantômes) → relancer les tests Deno sync.

**e) Vérification RUNTIME + correspondance visuelle ≥ 97 %** (par `qa-visual`, indépendant) :

- App `:3001` (`make dev-web`), login réel via Mailpit (`http://127.0.0.1:54324`).
- Maquettes `:8770`. **Screenshot 4× par écran modifié** : desktop 1440 **light + dark**, mobile 375 **light + dark**.
- **RÉFLEXE NON NÉGOCIABLE** : basculer **light ET dark** avant toute conclusion (faux positif sinon).
- Grille 100 pts (composition/hiérarchie, tokens light, tokens dark, espacements base-4, mobile, états empty/loading/error, parité) → **seuil PASS = ≥ 97 %**, écarts mineurs loggés et assumés. **Aucun hex hors token** ; sévérité/statut négatif jamais en `#E93E3A`.

**f) Sécurité/RLS** : tests négatifs (caller non habilité refusé) ; un club désactivé inaccessible à ses membres (NET-018) ; staff-par-club isolé (ADM-009) ; OPS-007 : un échec de log ne fait JAMAIS échouer la mutation.

**g) Docs à jour** : `design-reference-map.md` (écran livré + arbitrages), `docs/qa/QA_REPORT_<date>.md`, et `docs/GUIDE_UTILISATION.md` si une fonctionnalité très nouvelle (désactivation club, console feedbacks).

> **Gate vert ≠ conforme.** La preuve, c'est le **rendu/headers/RLS observés au runtime** (light & dark, fr & en), pas la sortie de `make test`.

## 7. LIVRABLES & REPORTING

- Code sur `feat/net-b-vague`, **commits FR atomiques par ticket** (push sur demande, branche dédiée).
- **Rapport par ticket** : SCORECARD (fonctionnel + visuel light/dark % + RGAA/sécurité), preuves réelles.
- **Rapport final** : `docs/qa/QA_REPORT_<date>-net-b-vague.md` (verdict PASS/FAIL par couche).
- **Actions owner** listées (migrations à pousser en prod, redeploy Edge `sync`, secrets, etc.).

---

**DÉMARRE par la Phase 0** (lire sources + audit code réel + servir maquettes + gate baseline), **puis présente le plan ordonné AVANT de lancer les implémenteurs.** N'implémente rien tant que l'owner n'a pas validé le plan.
