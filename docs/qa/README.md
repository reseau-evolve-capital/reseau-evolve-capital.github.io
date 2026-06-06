# QA harness — Evolve Capital (`apps/web`)

Système de QA **piloté par la donnée** : les checkpoints (flows métier, régressions, visuel, a11y) vivent dans des
fichiers `.md` **éditables au fil de l'eau**, et des **agents** (`.claude/agents/qa-*.md`) les lisent à chaque cycle.
On ajoute un flow / une régression / un critère → l'agent le teste automatiquement au cycle suivant. Aucun code à toucher.

## 📁 Structure

```
docs/qa/
  README.md         ← ce fichier (lancement, orchestration, journal des retours)
  FLOWS.md          ← parcours utilisateur critiques à valider (LE plus important)
  REGRESSIONS.md    ← bugs corrigés à ne PAS réintroduire (+ test de garde + vigilance)
  VISUAL.md         ← références visuelles (standalone-exports :8770, screens, captures)
  RGAA.md           ← critères a11y (AA / AAA chiffres-clés, axe, Lighthouse)

.claude/agents/
  qa-orchestrator.md ← chef d'orchestre : lit docs/qa/*, cible via git diff, dispatche, fail si régression
  qa-unit.md         ← Vitest (composants/data/mappers modifiés)
  qa-e2e.md          ← Playwright (flows de FLOWS.md)
  qa-visual.md       ← screenshots vs standalone-exports (light/dark/mobile)
  qa-a11y.md         ← axe (Playwright) + Lighthouse + RGAA.md
  qa-reporter.md     ← synthèse finale → QA_REPORT_[date].md
```

## 🧰 Environnement & commandes (vérité projet)

> ⚠️ **Le gate `make lint typecheck test` n'exécute NI les tests Deno NI les e2e.** Il faut les lancer à part.

| But                                        | Commande                                                                                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gate unitaire (lint+typecheck+vitest)      | `make lint typecheck test` (ou `pnpm turbo lint typecheck test`)                                                                                                               |
| Un workspace                               | `pnpm turbo test --filter=@evolve/web` (ou `@evolve/ui`, `@evolve/data`)                                                                                                       |
| App membre (dev)                           | `make dev-web` → **`http://localhost:3001`** (PAS `127.0.0.1`, cf. #R-024b)                                                                                                    |
| **Tests Deno** (Edge `sync`, `send-email`) | `~/.deno/bin/deno test --no-check --allow-all --config supabase/functions/<fn>/deno.json supabase/functions/<fn>/__tests__/*.test.ts`                                          |
| **e2e Playwright**                         | `SUPABASE_SERVICE_ROLE_KEY="$(supabase status -o env \| grep -i service_role \| cut -d= -f2 \| tr -d '\"')" pnpm --filter @evolve/web exec playwright test <spec> --workers=1` |
| Réfs visuelles                             | `cd <REC>/standalone-exports && python3 -m http.server 8770`                                                                                                                   |
| Login réel (magic link)                    | Mailpit `http://127.0.0.1:54324/api/v1/messages` → ConfirmationURL `/auth/v1/verify` (flux PKCE) → 1er clic                                                                    |
| Re-sync matrice                            | `supabase functions serve --env-file supabase/functions/.env` (terminal dédié) puis `SUPABASE_SERVICE_ROLE_KEY=... make db-sync CLUB_ID=<id>`                                  |

### Gotchas à connaître (sinon faux négatifs)

- **e2e ⇒ seed propre.** Les specs mockées (`portfolio`, `contributions`, `dashboard`) DÉRIVENT si la vraie matrice est chargée (le SSR renvoie les vraies données → le mock ne s'applique pas). Pour un run fiable : `make db-reset` (réapplique migrations + seed). ⚠️ **destructif** (wipe la matrice synchronisée) → re-sync ensuite si besoin. **Ne pas db-reset sans prévenir l'owner si la matrice réelle est en cours d'usage.**
- **Contamination cross-spec.** `loginAsSeedMember` met `onboarding_completed=true` ; `auth.spec` (flow onboarding) le veut `false` → durci via `resetOnboardingFor` (#R-024 voisin). Lancer un spec en isolation lève le doute contamination vs vraie régression.
- **`127.0.0.1` vs `localhost`** (dev) : tester sur **`localhost:3001`** (le magic link y redirige).
- **Templates email auth** : après modif `config.toml`, `supabase stop && supabase start -x vector,logflare` (db-reset ne recharge pas l'auth). Cf. #R-023.
- **`member_quote_part` est une VUE** (plus une MV) → ne JAMAIS `REFRESH MATERIALIZED VIEW`.

## 🎻 Approche d'orchestration

`qa-orchestrator` (déclenché en fin de session ou à la demande) :

1. Lit `docs/qa/{REGRESSIONS,FLOWS,VISUAL,RGAA}.md`.
2. `git diff main...HEAD --name-only` → identifie les zones touchées, croise avec les **Vigilance** de REGRESSIONS.md.
3. Dispatche en parallèle les sous-agents (outil **Agent**, `subagent_type: qa-unit|qa-e2e|qa-visual|qa-a11y`) sur le périmètre ciblé.
4. Collecte → délègue à `qa-reporter` → `QA_REPORT_<date>.md` (dans `docs/qa/`).
5. **RÈGLE :** statut ≠ « OK » si un test de REGRESSIONS.md échoue.

## ▶️ Prompts de lancement (Claude Code)

**Cycle complet sur les derniers changements :**

```
Utilise l'agent qa-orchestrator : lance un cycle QA complet sur les changements depuis main
(lis docs/qa/*, cible via git diff, dispatche qa-unit/qa-e2e/qa-visual/qa-a11y, puis qa-reporter).
```

**Ciblé sur un flow + des régressions :**

```
Utilise l'agent qa-orchestrator : vérifie uniquement FLOW-001 (auth) + FLOW-002 (onboarding)
et les régressions R-014, R-017, R-019, R-020.
```

**Itérer jusqu'au vert :**

```
/loop  Utilise qa-orchestrator pour faire passer tous les tests de REGRESSIONS.md ;
itère dev→fix→re-test, stop quand vert ou après 10 tours.
```

## 📝 Maintenance — comment faire évoluer le harnais

- **Nouvelle fonctionnalité majeure livrée** → ajouter un `FLOW-0XX` dans FLOWS.md (étapes + criticité + réfs visuel/RGAA).
- **Bug corrigé** → ajouter un `R-0XX` dans REGRESSIONS.md (symptôme + test de garde + **Vigilance** = fichiers à surveiller).
- **Nouvel écran/réf design** → ligne dans VISUAL.md (mapping écran ↔ standalone-export).
- **Nouveau critère a11y** → RGAA.md.
- Garder les numéros `FLOW-`/`R-` STABLES (référencés en croisé).

---

## 🧪 Journal des retours / tests (à compléter au fil de l'eau)

> Historique des retours utilisateur (bugs vus en test manuel) et de leur traitement. Sert de mémoire et alimente REGRESSIONS.md.

| Date       | Retour                                                                                                  | Origine          | Devenu                   | Statut                       |
| ---------- | ------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------ | ---------------------------- |
| 2026-06-05 | Lot E-QA1 (sync rôles/positions, portfolio, cotisations, dashboard E1, admin, auth, email, invitations) | Test utilisateur | R-001→R-013, R-027→R-034 | ✅ corrigé + QA runtime      |
| 2026-06-06 | Onboarding = composant nu, manque layout + toggle                                                       | Test utilisateur | FLOW-002, R-017 (chrome) | ✅ chrome livré              |
| 2026-06-06 | Champs onboarding non pré-remplis (nom/prénom/tél/adresse)                                              | Test utilisateur | R-019                    | ✅ corrigé                   |
| 2026-06-06 | Aperçu avatar absent à l'upload                                                                         | Test utilisateur | R-021 (+ CSP)            | ✅ corrigé                   |
| 2026-06-06 | Lien charte → /legal/charter 404                                                                        | Test utilisateur | R-022                    | ✅ corrigé                   |
| 2026-06-06 | Avatar mal affiché (composant + profil)                                                                 | Test utilisateur | R-021b                   | ✅ corrigé                   |
| 2026-06-06 | Téléphone vide sur /profil                                                                              | Test utilisateur | R-020                    | ✅ corrigé (route défensive) |
| 2026-06-06 | (QA) perte d'état si lien légal même onglet                                                             | QA runtime       | R-025                    | ✅ corrigé (nouvel onglet)   |
| 2026-06-06 | (QA) app n'hydrate pas via 127.0.0.1                                                                    | QA runtime       | R-024b                   | ✅ corrigé (dev-only)        |

### Dettes ouvertes (à surveiller)

- Store onboarding non persisté → **reload** complet en plein onboarding perd tél/adresse en cours (avatar récupérable). Follow-up : `persist` sessionStorage + reset-fin + clé par-user.
- Cible tactile cellules cotisation (#R-005), chip toast 20px, `brand-yellow-50` absent.
- Actions owner prod : activer hook `[auth.hook.send_email]` (emails localisés), pousser migrations 029/030/031, DSN Sentry régional, logo SVG transparent.
