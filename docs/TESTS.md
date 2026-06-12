# Evolve Capital — Tests, couverture & état fonctionnel

> Branche : **`main`**. Mis à jour le 2026-06-05 (révision branche : 2026-06-11).
> Ce document présente **ce qui est construit** et surtout **la couverture de tests** du projet,
> du test unitaire au end-to-end. Objectif : pouvoir **détecter une régression** dès qu'un comportement change.

---

## 1. Ce qui est fonctionnel (V0)

L'app membre `apps/web` (Next.js 16, App Router) couvre aujourd'hui :

| Domaine                      | Détail                                                                                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth & onboarding**        | Lien magique (sans mot de passe, allowlist d'emails invités) ; onboarding 3 étapes + tour guidé ; contrôle d'accès (blocage/déblocage par club, écran « accès suspendu »).          |
| **Espace membre**            | Tableau de bord (quote-part, KPIs) ; portefeuille (positions, donut sectoriel, tri/filtre URL, valo live + repli snapshot) ; cotisations (frise mensuelle, statuts, alerte retard). |
| **Espace trésorier**         | Tableau de bord club, liste membres (filtre impayés, contrôle d'accès), cotisations club, invitations (lien nominatif 72 h).                                                        |
| **Données**                  | Matrice **Google Sheets → Edge Function `sync` → Postgres → app** (lecture du miroir Postgres, jamais Sheets en direct). RLS sur toutes les tables.                                 |
| **Notifications**            | Toasts + bannières ; emails Brevo (magic-link, bienvenue, erreur sync, attestation) ; PDF attestation de détention + page publique `/verifier`.                                     |
| **i18n & thème**             | next-intl (FR défaut, parité fr/en) ; clair/sombre.                                                                                                                                 |
| **Observabilité & sécurité** | Sentry (no-op sans DSN), Cloudflare Web Analytics, CSP + headers, rate-limit Upstash, Lighthouse CI.                                                                                |

⚠ **Limites V0 connues** (voir §6 et le récap « reste-à-faire ») : 4 correctifs **P0 avant prod** identifiés (dont une fuite IDOR sur la vue matérialisée), Edge Functions pas encore en CI, pas de test e2e « vraie matrice Google Sheets ».

---

## 2. Philosophie de test (4 couches)

On choisit **la couche la plus basse qui couvre vraiment le comportement** (cf. CLAUDE.md §Stratégie de tests) :

1. **Unitaire — Vitest** : logique pure (formatters, parsers de dates, mappers Sheets→DTO, loaders de données, hooks, rate-limit).
2. **Interaction — Storybook 10 `play`** : vrais événements utilisateur (clic, clavier, focus) sur les composants `@evolve/ui`.
3. **A11y — jest-axe (Vitest) + `@axe-core/playwright`** : zéro violation WCAG 2 A/AA sur composants et pages clés.
4. **E2E — Playwright** (`apps/web`) : parcours irréversibles (login magic-link, dashboard, portefeuille, cotisations, admin, accès, attestation, vérification publique, i18n).

---

## 3. Inventaire des tests (chiffres réels, vérifiés le 2026-06-05)

### 3.1 Récapitulatif

| Couche                       | Outil                                |            Fichiers |     Cas | Lancé par `make test` ? |
| ---------------------------- | ------------------------------------ | ------------------: | ------: | :---------------------: |
| Unitaire + composants + a11y | Vitest + @testing-library + jest-axe |              **71** | **570** |           ✅            |
| Interaction                  | Storybook `play`                     | 27 (sur 55 stories) |      27 |     ⚠ via Storybook     |
| E2E + e2e-a11y               | Playwright + @axe-core/playwright    |              **10** |  **45** |  ❌ (`make test-e2e`)   |
| Edge Function `sync`         | Deno test                            |                   1 |  **21** |    ❌ (`deno test`)     |

> **Total automatisé : ~663 cas** (570 Vitest + 45 e2e + 27 play + 21 Deno).
> `make test` (CI) exécute les **570 Vitest** ; les 19 cas RLS d'isolation sont _skippés sans base locale_ (→ 551 en CI, **570 stack locale up**).

### 3.2 Détail par workspace (Vitest)

| Workspace       | Fichiers | Cas | Ce que ça couvre                                                                                                                                              |
| --------------- | -------: | --: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@evolve/utils` |        4 |  37 | `formatEUR`/`formatPct`/`formatDate` (locale FR, NBSP), parsing dates FR (`01/06/2018`), coercition `string→number` (NaN→null), normalisation strings/emails. |
| `@evolve/data`  |       17 | 123 | **Mappers Sheets→DTO (53)**, client Sheets (3), providers de prix (8), **isolation RLS (19, skip sans DB)**, emails React (27), PDF attestation (13).         |
| `@evolve/ui`    |       39 | 320 | Atoms/molecules/organisms : rendu, props, états vides/erreur, a11y (jest-axe intégré), claviers, tokens.                                                      |
| `@evolve/web`   |       11 |  90 | **Loaders de données** (`lib/data/*`), hooks React Query, routes API (magic-link, onboarding), helper rate-limit.                                             |
| `@evolve/types` |        0 |   0 | Types seuls (vérifiés par `tsc`).                                                                                                                             |

### 3.3 Interaction — Storybook `play` (27)

27 stories de `packages/ui` embarquent une `play` function (clic, saisie, focus, assertions). Exemples : `Button` (clic→callback), `Checkbox` (check/uncheck), `InviteForm` (saisie email + validation + submit), `FilterBar` (filtre secteur + tri), `DashboardHero` (ouverture modale), `PortfolioTable` (tri colonne). Lancées dans l'onglet _Interactions_ de Storybook (`make storybook`).

### 3.4 E2E — Playwright (45 tests, 10 specs)

`apps/web/playwright/`, **`workers: 1`** (sériel — état seed partagé), `global-setup.ts` réinitialise la DB avant le run, `baseURL http://localhost:3001`.

| Spec                    | Tests | Parcours couvert                                                                                                                               |
| ----------------------- | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.spec.ts`          |     5 | Login magic-link (Inbucket), vérification, session, redirections.                                                                              |
| `dashboard.spec.ts`     |     7 | Dashboard chargé, skeleton→données, données périmées >2 h, modale détail, pull-to-refresh mobile, sans-auth→/login, repères a11y. (API mockée) |
| `portfolio.spec.ts`     |     5 | Tableau positions, donut, tri/filtre, modale position. (données réelles)                                                                       |
| `contributions.spec.ts` |     5 | Frise mensuelle par année, statuts (payé/retard), légende.                                                                                     |
| `admin.spec.ts`         |     5 | Tableau club, liste membres, invitations, cotisations, actions.                                                                                |
| `access.spec.ts`        |     6 | Invitations (pending→revoke→revoked), verrou compte→/acces-suspendu→déblocage, a11y.                                                           |
| `attestation.spec.ts`   |     3 | Génération PDF attestation, téléchargement.                                                                                                    |
| `verifier.spec.ts`      |     2 | Page publique de vérification (lecture seule).                                                                                                 |
| `i18n.spec.ts`          |     2 | Bascule FR/EN, persistance cookie.                                                                                                             |
| `a11y.spec.ts`          |     5 | Scan axe-core (WCAG 2 A/AA, critical/serious) sur `/login`, `/404`, `/dashboard`, `/portfolio`, `/contributions`.                              |

---

## 4. Couverture du flux DONNÉES (cœur du produit)

> L'idée centrale : **lire la matrice Google Sheets dans l'app**. Voici comment c'est testé, étape par étape.

```
Google Sheets ──(readSheet, JWT RS256)──▶ Edge Function sync ──(mappers)──▶ Postgres ──(RLS)──▶ app (lib/data)
   [21 Deno]                                  [53 Vitest mappers]            [19 RLS]      [90 web + e2e]
```

| Étape du flux                                                                                                                 | Tests                                                                                                                                                                                                                                                                                                            | Fichiers                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **1. Parsing Sheets → DTO** (chaque feuille : Base, Portefeuille, Historique, Cotisations, Détails cotisations, Paramétrages) | **53 cas** : décomposition nom/prénom, normalisation email, dates FR→ISO, statut « Membre sorti », isolation des lignes d'agrégat (symbol vide), période FR « juin 2018 »→{year,month}, matching nom→membership, `NaN→null`, **idempotence** (fixture figée).                                                    | `packages/data/src/sheets/mappers/__tests__/*.test.ts` (dont `integration.test.ts`, réf SHE-008). |
| **2. Orchestration sync** (Sheets→Postgres)                                                                                   | **21 cas Deno** : parsers bas niveau, checksums SHA-256 déterministes, **handler complet** (6 feuilles dans l'ordre impératif, idempotence sur 2 syncs, panne partielle d'une feuille n'arrête pas les autres, club introuvable→404, Paramétrages avant Base). `readSheet` et le client Supabase sont _stubbés_. | `supabase/functions/sync/__tests__/sync.test.ts`                                                  |
| **3. Isolation en base (RLS)**                                                                                                | **19 cas** : un membre ne lit/écrit que son club (SELECT vide cross-club, INSERT `42501`, UPDATE/DELETE 0 ligne), helpers `get_user_club_ids`/`get_user_role_in_club`, contrôle service-role.                                                                                                                    | `packages/data/src/supabase/__tests__/rls-isolation.test.ts`                                      |
| **4. Lecture côté app** (depuis Postgres)                                                                                     | `dashboard` (6 — coercition numérique, fallback), `contributions` (14 — frise/statuts/aria), `portfolio` (11 — allocation/tri), `admin` (22 — listes), `invitations` (7), hooks (8).                                                                                                                             | `apps/web/lib/data/*.test.ts`, `apps/web/lib/hooks/*.test.ts`                                     |
| **5. Rendu écran** (parcours réel)                                                                                            | e2e `dashboard`/`portfolio`/`contributions`/`admin` rendent les données et vérifient l'UI.                                                                                                                                                                                                                       | `apps/web/playwright/*.spec.ts`                                                                   |

**Verdict** : le parsing Sheets→DTO, l'orchestration du sync, l'isolation RLS et la lecture côté app sont **couverts à chaque maillon**. ⚠ Le **seul maillon non testé en automatique** est le bout-à-bout **live** (vraie matrice Google → vraie API Sheets → DB → app), qui exige des credentials Google (voir `docs/GUIDE_DEV_LOCAL.md` §Sync Sheets en local).

---

## 5. Comment lancer chaque couche

```bash
# 1. Unitaire + composants + a11y (Vitest) — tout le monorepo (= la CI)
make test
pnpm --filter @evolve/ui   test          # un workspace
pnpm --filter @evolve/data test:rls      # suite d'isolation RLS (stack locale requise)

# 2. Interaction (Storybook play)
make storybook                           # onglet « Interactions »

# 3. E2E (Playwright) — stack Supabase démarrée + clé service_role
SUPABASE_SERVICE_ROLE_KEY="$(supabase status -o env | grep -i service_role | cut -d= -f2 | tr -d '\"')" \
  pnpm --filter @evolve/web exec playwright test
pnpm --filter @evolve/web exec playwright test portfolio.spec.ts   # un flow

# 4. Edge Function sync (Deno) — NON inclus dans `make test`
deno test --allow-env --config supabase/functions/sync/deno.json \
  supabase/functions/sync/__tests__/sync.test.ts

# 5. Lighthouse (pages publiques) — local
pnpm lighthouse

# Gate complet avant push (comme la CI)
make typecheck lint test
```

---

## 6. Trous de couverture & robustesse (transparence)

| #   | Trou                                                                                                                                                                                                 | Gravité | Statut                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----: | ----------------------------------------------------------------- |
| 1   | **Edge Functions hors CI** : `sync.test.ts` (21 cas Deno) et les autres fonctions ne tournent que localement → une régression du sync ne casserait pas la CI.                                        |   🔴    | À brancher (job Deno en CI).                                      |
| 2   | **Pas de test e2e « vraie matrice Google Sheets »** : le bout-à-bout live n'est pas automatisé (credentials Google requis).                                                                          |   🟠    | À faire avec la matrice de test (manuel d'abord, puis e2e dédié). |
| 3   | **Vue matérialisée `member_quote_part` sans isolation** : lisible par tout rôle `authenticated` (les MV n'acceptent pas de RLS) → **fuite IDOR financière** inter-membres.                           |   🔴    | **P0 avant prod** — `REVOKE` + RPC `SECURITY DEFINER`.            |
| 4   | **Routes API peu testées en isolation** : seules `magic-link` et `onboarding/profile` ont des tests Vitest ; `sync`, `admin/*`, `market-prices`, `attestation` sont surtout couvertes via e2e/mocks. |   🟡    | Élargir les tests de route.                                       |
| 5   | **Parcours mobile partiel** : seul `dashboard` est testé en viewport mobile ; `portfolio`/`admin`/`contributions` mobiles non couverts e2e.                                                          |   🟡    | Ajouter `test.use({ viewport })`.                                 |
| 6   | **`apps/vitrine` : aucun test** (vitrine légacy, non refacto).                                                                                                                                       |   🟢    | Accepté (hors périmètre).                                         |

Voir le **récap « reste-à-faire »** (réponse de session / `docs/audits/ANALYSE-PRODUIT-2026-06-05.md`) pour les 4 correctifs **P0 avant prod** et la dette V1.

---

## 7. Détection de régression

- **Gate CI** (`.github/workflows/ci.yml`) : `typecheck + lint + test` (570 Vitest) + 3 gardes design-system (pas de hex en dur, lucide via `Icon`, `TrendBadge` sans brand-red) + build `apps/web`. Bloquant sur PR vers `main` et push sur `main`.
- **Lighthouse CI** (`.github/workflows/lighthouse.yml`) : seuils Perf ≥ 80 / A11y ≥ 90 / BP ≥ 90 / SEO ≥ 90 sur pages publiques.
- **Local** : `make test-e2e` (45 parcours) + `deno test` (sync) avant toute livraison touchant données/parcours.
- **Principe** : tout nouveau comportement UI ⇒ test à la couche la plus basse qui le couvre ; toute string ajoutée ⇒ clés `fr` **et** `en`.
