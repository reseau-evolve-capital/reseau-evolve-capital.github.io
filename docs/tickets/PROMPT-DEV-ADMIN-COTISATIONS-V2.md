# Prompt d'orchestration — Refonte « Espace trésorier › Cotisations » (V2)

> À coller au démarrage d'une **nouvelle session Claude Code**. Tu es le **LEAD ORCHESTRATEUR**. Tu décomposes, dispatches des **sub-agents Sonnet** (IMPLEMENTER), fais tourner la boucle dev → test → QA → fix par ticket, et arbitres. **Tu ne codes pas les features toi-même.**

---

## Mission

Implémenter la refonte de l'écran `apps/web` → `/admin/cotisations` (espace trésorier), spécifiée et validée. L'écran passe d'une « photo d'état » illisible à un **poste de pilotage à deux modes** (club / membre).

**Branche de travail (déjà créée, déjà sur `main` à jour)** : `feat/admin-cotisations-v2`. Vérifie que tu es bien dessus (`git rev-parse --abbrev-ref HEAD`). Branche PR cible : `main`.

## Sources de vérité — À LIRE EN PHASE 0 (obligatoire)

1. **Spec validé** : `docs/superpowers/specs/2026-06-21-admin-cotisations-redesign-design.md` ← le contrat. Lis-le en entier.
2. **Analyse amont** (le « pourquoi ») : `docs/product/ANALYSE-UX-ADMIN-COTISATIONS-2026-06-21.md`.
3. **Design de référence (cible visuelle)** : `REC/standalone-exports/Cotisations - Bureau de club (standalone).html` — auto-suffisant, **toggle light/dark** (`data-theme`). Sers-le : `cd "REC/standalone-exports" && python3 -m http.server 8770` puis ouvre-le. **Bascule light ET dark avant toute conclusion visuelle.**
4. **Conventions** : `CLAUDE.md` (tokens design-system, jaune marque ≠ rouge dataviz `--color-data-negative-500`, `formatEUR`/`formatPct`, a11y AA/AAA, TS strict, RGAA `cursor: pointer`, commits FR conventionnels scope `web`/`ui`/`data`).

## Objectif de qualité — NON négociable

- **Conformité visuelle ≥ 97 %** avec le standalone de référence, **en light ET en dark**, sur les deux modes (club + membre) + la modale de relance. Mesure via l'agent `qa-visual` (screenshots runtime vs standalone :8770) — composition, espacements, tokens, typographie, états.
- **Zéro régression** : le gate complet passe au vert (`make lint typecheck test`), e2e `--workers=1`, `cursor-pointer.spec.ts` 0 échec, axe sur les deux modes. Les flows existants (dashboard, portfolio, admin membres) ne cassent pas.
- **Gate vert ≠ conforme** : la preuve, c'est le **rendu runtime observé** (light/dark, fr/en), pas le vert du CI.

## Périmètre (rappel du spec)

**Mode CLUB** (`?membre` absent / « Tous les membres ») : bandeau synthèse **déterministe** + 3 KPI recadrés (Taux de recouvrement · En retard € + nb membres · Encaissé) + bloc **« À régulariser »** (liste nominative, tri montant décroissant, bouton Relancer, empty state positif). **Pas de frise.**

**Mode MEMBRE** (`?membre=<id>`) : en-tête membre (nom · adhésion · badge statut) + 3 KPI perso (Recouvrement · Dû · **Valeur nette**) + encart « À régulariser » si en retard + **frise mensuelle CONSERVÉE telle quelle**.

**Relance v1** : modale, message **pré-rempli par gabarit déterministe** (pas de LLM), éditable, envoi via Brevo/Edge existant. Le brouillon LLM est **hors périmètre** (follow-up `relance-ia`).

**Réutilise l'existant** : `deriveContributionStatus`, `deriveAmountDue` (`lib/data/contributionStatus.ts`), la logique « impayé » de `MembersList`/`/admin`, `ContributionsTimeline`, `buildMonthTooltip`. Pas de nouvelle table.

## Découpage en tickets (ordonnancement)

> Sérialise les ressources partagées, parallélise le reste. `KPICard` (packages/ui) et `admin.ts` (data) sont des dépendances amont — les faire AVANT les panneaux.

| #      | Ticket                                                                                                                         | Fichiers (indicatif)                                                                     | Dépendances | Parallélisable                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ----------- | --------------------------------------------- |
| **T1** | Prop `hint?` + icône `(i)`/popover sur `KPICard`                                                                               | `packages/ui` (KPICard + story + play test)                                              | —           | (amont, fais en 1er)                          |
| **T2** | Data layer : `computeRecoveryRate`, `computeEncaisse`, `buildRegulariserList` (nominatif) + gabarit synthèse + gabarit relance | `apps/web/lib/data/admin.ts` (+ tests Vitest)                                            | —           | ∥ avec T1                                     |
| **T3** | `ClubCotisationsPanel` + `RegulariserList` (synthèse, 3 KPI, liste, empty state, lignes cliquables→membre)                     | `apps/web/components` ou `packages/ui` (présentationnel)                                 | T1, T2      | ∥ avec T4                                     |
| **T4** | `MemberCotisationsPanel` (en-tête, 3 KPI perso, encart, **frise conservée**)                                                   | `apps/web/components`                                                                    | T1, T2      | ∥ avec T3                                     |
| **T5** | `RelanceModal` (gabarit, édition, envoi Brevo)                                                                                 | `apps/web/components` + Edge existant                                                    | T2          | ∥ après T2                                    |
| **T6** | Wiring `AdminCotisationsView` (bascule mode selon `membershipId`) + i18n fr/en                                                 | `apps/web/app/(app)/admin/cotisations/AdminCotisationsView.tsx`, `messages/{fr,en}.json` | T3, T4, T5  | **sérialisé en dernier** (ressource partagée) |

Le **lead câble les barrels** (`packages/ui` index) et résout les collisions sur `AdminCotisationsView` / `messages`. Assigne ces fichiers partagés explicitement — pas deux implémenteurs dessus en parallèle.

## Roster (sub-agents)

- **PLANNER** (read-only) : confirme l'audit Phase 0, vérifie que l'état réel du code colle au spec (les chemins/helpers existent : `deriveAmountDue`, `MembersList`, `ContributionsTimeline`), ressort les ancres exactes + critères d'acceptation par ticket. Présente le plan ordonné **AVANT** de lancer les implémenteurs.
- **IMPLEMENTER** (×N, **modèle Sonnet**) : un par ticket, **TDD**, gate du workspace touché vert avant de rendre. Respecte tokens/format/a11y.
- **QA** : `qa-orchestrator` → dispatch `qa-unit` / `qa-e2e` / `qa-visual` (conformité ≥97 % light/dark vs :8770) / `qa-a11y`. **Vérif RUNTIME**, max 3 itérations de fix par ticket.
- **ARBITER** (le lead) : tranche les divergences spec ↔ design ↔ code, logge dans `docs/audits/design-reference-map.md`.

> Lance les sub-agents IMPLEMENTER avec le modèle **Sonnet**. Le lead (toi) reste sur le modèle courant pour orchestrer/arbitrer.

## Gate « fait » (par ticket puis global)

1. Critères d'acceptation du ticket OK.
2. `make lint typecheck test` **vert** (preuve réelle collée).
3. Tests de la couche touchée : `pnpm turbo test --filter=@evolve/ui` (si T1/T3), Vitest data (T2), e2e `--workers=1` (T6).
4. `pnpm --filter @evolve/web exec playwright test cursor-pointer.spec.ts --workers=1` → **0 échec**.
5. **Rendu runtime light & dark** + **check i18n EN + parité fr/en** sur les deux modes.
6. **Conformité visuelle ≥ 97 %** confirmée par `qa-visual` (light + dark).
7. `docs/audits/design-reference-map.md` mis à jour (écran ↔ route, divergences arbitrées).

## Livraison

- **Commits FR atomiques par ticket** (Conventional Commits, scopes `web`/`ui`/`data`). Husky/commitlint actifs.
- **Push uniquement sur demande** de l'owner.
- Rapport final : tickets livrés, preuve gate, score de conformité visuelle light/dark, régressions vérifiées, dette/follow-ups (`relance-ia`, question §12 du spec si tranchée).

## Décisions déjà prises (ne pas rouvrir sans l'owner)

- Synthèse = **déterministe**, pas de LLM.
- Relance v1 = **gabarit**, pas de LLM.
- **Pas de frise en mode club** ; frise conservée en mode membre.
- Anciens KPI (Total cotisé / Versements / Moyenne) : **supprimés** de la vue principale (défaut spec §12 — confirmer à l'owner si doute, ne pas réintroduire sans accord).

## Gotchas connus (mémoire projet)

- Port `:3001` parfois squatté (Cursor IPv4) → fallback `:3011`, et `NEXT_PUBLIC_SITE_URL` à aligner pour l'e2e.
- e2e : seed propre (`make db-reset`) sinon dérive de la matrice réelle ; service role pour seeder.
- `KPICard`/`packages/ui` : **aucune dépendance i18n** dans le package — le copy passe par props.
- commitlint : description en **minuscule**.
- `formatEUR()` = `1 234,56 €` (NBSP) ; jamais de `toLocaleString` direct.
