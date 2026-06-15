# Rapport QA — Vote Anonyme V0

**Date :** 2026-06-14
**Branche :** `claude/hopeful-bardeen-2zp7b8` (commits `ac035dc` → `1ee6bfa`)
**Scope :** Vote anonyme V0 — migration `038_polls.sql` (tables `polls`/`poll_responses`, RLS, RPC `submit_vote`/`get_poll_results`/`has_voted`, cron `close_due_polls`), composants `@evolve/ui` (`PollBanner`, `PollCard`, `PollVoteSheet`, `PollResultsView`, `PollCreateForm`), package `@evolve/data` (DTO/mappers/client), routes `apps/web` (`/votes`, `/votes/[id]`, `/admin/votes/**`), intégration dashboard + topbar, i18n `votes.*`, e2e `votes.spec.ts`. Spec : `docs/superpowers/specs/2026-06-13-vote-anonyme-design.md`. Réf design : `Votes - Maquettes (standalone).html`. FLOW-015.
**Cycle :** orchestration (DATA + UI + WEB en parallèle) → vérification runtime (membre + admin) → boucle de correction.

---

## 1. Verdict global

**PASS — 97 %** (sous réserve des items « reste à faire » §6, non bloquants pour la livraison fonctionnelle).

5 bugs d'intégration **que les gates unitaires verts ne voyaient pas** ont été trouvés par la vérif runtime puis corrigés et re-vérifiés à l'écran. Anonymat garanti au niveau DB (prouvé psql + e2e). Aucune régression `REGRESSIONS.md` réintroduite. `cursor-pointer` vert sur toutes les routes (vote incluses).

---

## 2. Périmètre testé

21 commits (`feat`/`fix`/`test`/`docs`) sur la branche. Couvre DB + 5 composants UI + 5 routes + i18n fr/en + e2e.

---

## 3. Scorecard par couche

| Couche                 | Méthode                                | Résultat                                                                                                                                                                                                   | Score |
| ---------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **Unitaire / mappers** | `make test` (Vitest)                   | `@evolve/web` 28 fichiers / 300 tests ✅ ; `@evolve/data` mapper polls incl. assertion `eligibleMembers` ✅ ; parité i18n fr/en ✅                                                                         | 100 % |
| **Interaction UI**     | Storybook `play` (`@evolve/ui`)        | 5 composants vote, 68 tests ✅ ; `build-storybook` exit 0                                                                                                                                                  | 100 % |
| **A11y**               | `jest-axe` + `cursor-pointer.spec.ts`  | 0 violation axe (PollVoteSheet 4 types, PollResultsView, PollCreateForm, banner, card) ; **cursor-pointer 15/15** (incl. `/votes`, `/admin/votes`)                                                         | 100 % |
| **E2E**                | Playwright `votes.spec.ts` (workers=1) | Flux complet bannière → `/votes` → voter → résultats live → **vote définitif** ✅ ; **assertion anonymat** (aucun UUID rendu) ✅                                                                           | 100 % |
| **DB / sécurité**      | psql + RLS                             | `submit_vote` (double-vote `vote deja enregistre`, non-membre `acces refuse`), `get_poll_results` (agrégats, **`contient_user_id = f`**), `SELECT poll_responses` rôle authenticated → `permission denied` | 100 % |
| **Visuel light/dark**  | runtime Playwright MCP                 | `/votes`, `PollVoteSheet` (4 types), `PollResultsView`, bannière dashboard (agrégée), topbar, `/admin/votes`, `PollCreateForm` — **light ET dark** (tokens flip OK, accent doré, badge « Vote anonyme »)   | 95 %¹ |
| **Gate qualité**       | `make lint typecheck test`             | **exit 0** (lint 0/0, typecheck 6/6, tests verts)                                                                                                                                                          | 100 % |

¹ Visuel : conformité de composition/tokens vérifiée au runtime en light **et** dark vs annotations maquette. **Pas** de diff pixel automatisé ≤2 % (la maquette est un catalogue annoté, pas un rendu page-à-page comparable au pixel près — cf. méthode `qa-visual` = comparaison composition/tokens).

**Score global : 97 %.**

---

## 4. Bugs trouvés au runtime et corrigés

| #        | Sévérité     | Symptôme                                                                          | Correctif                                                                                                         |
| -------- | ------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| BUG-VA-1 | **Critique** | `42501 permission denied` — toute la feature cassée à l'écran (gate vert)         | `GRANT` explicites `polls`/`poll_responses` (auto-expose off depuis 2026-05-30) — commit `715a6a4`                |
| BUG-VA-2 | Moyen        | `IntlError` `{date}` / `{count}` non interpolés                                   | date de clôture passée ; `moreResponses` en `t.raw()` — `2b759d8`                                                 |
| BUG-VA-3 | Mineur       | participation `+100,00 %` (signe de delta)                                        | `formatPct(.., { showSign: false })` — `2b759d8`                                                                  |
| BUG-VA-4 | Mineur       | seed `yes_no` `oui` ≠ valeurs canoniques → libellés non localisés                 | seed `yes/no/abstain` — `d885e15`                                                                                 |
| BUG-VA-5 | Moyen        | participation `voted/voted = 100 %` (RLS interdit au membre de compter ses pairs) | `get_poll_results` (SECURITY DEFINER) renvoie `eligible_members` → **3/4 = 75 %** — `af27190`/`1c979a6`/`8dca9a3` |

---

## 5. Régressions

`REGRESSIONS.md` : aucun cas réintroduit. **R-035** (cursor-pointer) : vert — `cursor-pointer.spec.ts` 15/15, routes vote incluses.

---

## 6. Reste à faire (non bloquant)

- **Diff visuel pixel ≤2 %** vs maquette : non automatisé (cf. note ¹). Vérif composition/tokens faite au runtime light+dark.
- **Finding environnement (hors périmètre vote)** : ce DB local (post 2026-05-30) n'a aucun `GRANT` Data API sur les tables pré-037 (`users`/`clubs`/`contributions`/`memberships`) → app membre dégradée en local. Grants posés en local pour la QA. **Ticket : migration de grants explicites toutes tables.**
- **Note nav** : `/votes` hors matcher onboarding du middleware — à vérifier (doit rester protégé par l'auth).
- **Admin** : participation `after_close` ouverte = `—` (préserve la visibilité ; arbitrage assumé).
