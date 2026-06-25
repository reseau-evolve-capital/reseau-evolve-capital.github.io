# QA REPORT — Sprint E-OPS-2 (module Opérations trésorier)

**Date :** 2026-06-26  
**Branche :** `feat/e-ops-2-saisie-tresorier`  
**Base :** `main`  
**Gate baseline (`make lint typecheck test`) :** VERT (fourni par l'owner)  
**Verdict global : FAIL — 1 violation a11y bloquante**

---

## Scorecard par dimension

| Dimension               | Verdict | Détail                                                                         |
| ----------------------- | ------- | ------------------------------------------------------------------------------ |
| UNIT — SQL psql         | PASS    | 11/11 assertions `supabase/tests/operations_rpc.sql` (exit 0, ROLLBACK propre) |
| UNIT — Vitest data      | PASS    | 256 tests, 29 skippés (RLS — attendu, requièrent DB live), 0 failure           |
| UNIT — Vitest ui        | PASS    | 766 tests (79 fichiers), 0 failure                                             |
| UNIT — Vitest utils     | PASS    | 39 tests format.test.ts, 0 failure                                             |
| E2E Playwright          | PASS    | 7/7 specs — voir détail, spec `operations.spec.ts` créée                       |
| A11Y — audit statique   | FAIL    | 1 violation bloquante (font-size textarea, RGAA règle 11 anti-zoom iOS)        |
| VISUEL — audit statique | WARN    | 4 findings MINEURS, 0 BLOQUANT ; conformité estimée **96 %**                   |
| I18N                    | PASS    | Parité fr/en parfaite — 120 clés / 120 clés namespace `admin.operations`       |

---

## Findings priorisés

### BLOQUANT (gate FAIL)

**BLK-1 — `OperationCancelModal` : `<textarea>` font-size 14px fixe sur mobile (anti-zoom iOS)**

- Fichier : `packages/ui/src/organisms/OperationCancelModal/OperationCancelModal.tsx`, ligne 131
- Code : `'text-[14px] text-text placeholder:text-text-ter'` sur la `<textarea>` de saisie du motif
- Règle : RGAA.md §11 + CLAUDE.md — tout `input`/`textarea`/`select` doit avoir `font-size ≥ 16px` sur mobile (iOS Safari/Chrome zoome automatiquement sur les champs < 16px)
- Référence conforme : `OperationField.tsx` ligne ~45 — `text-[16px] md:text-[14px]` (pattern correct)
- Correction : remplacer `text-[14px]` par `text-[16px] md:text-[14px]` sur la `<textarea>` (ligne 131)
- Statut : nouvelle violation introduite par E-OPS-2, absente de RGAA.md§ dettes connues

---

### MAJEURES (non bloquants gate, à corriger avant prod)

**MAJ-1 — `OperationFilterBar` : `FilterChip` 40px < 44px requis (cibles tactiles mobiles)**

- Fichier : `packages/ui/src/molecules/OperationFilterBar/OperationFilterBar.tsx`, ligne 24
- Code : `min-h-10` (40px) sur les `<button>` FilterChip
- Règle : RGAA.md §3 + WCAG 2.5.5 — cibles ≥ 44×44px sur mobile
- Correction : passer `min-h-10` à `min-h-11` (44px)
- Note : distincte de la dette #R-005 (cellules cotisation) — nouvelle occurrence

**MAJ-2 — `CashBalanceCard` : `aria-label` sur `<div>` non interactif sans `role` (BrokerBadge)**

- Fichier : `packages/ui/src/molecules/CashBalanceCard/CashBalanceCard.tsx`, ligne ~222
- Code : `<div aria-label={ariaLabel}>` sur le BrokerBadge non-interactif sans `role` explicite
- Règle : WCAG 4.1.2 — `aria-label` ignoré sur `role=generic` (rôle implicite des `<div>`)
- Correction : supprimer l'`aria-label` inutile (le contenu textuel reste accessible) ou ajouter `role="status"` si l'info doit être annoncée
- Impact pratique : faible (le texte visible contient l'information — pas de perte d'information pour les AT)

---

### MINEURS (dette à consigner)

**MIN-1 — `OperationsListView` : filtres Membre et Période non branchés (OPS-205 partiel)**

- Fichier : `apps/web/app/(app)/admin/operations/toutes/OperationsListView.tsx`, lignes 82-88
- La spec E-OPS-2 §5 montre 3 FilterChip (Type / Membre / Période). L'implémentation n'en câble qu'un (Type). `OperationFilterBar` supporte n filtres en déclaratif — seul le branchement côté view est absent.
- Impact : interface réduite vs spec, pas de bug visuel ou fonctionnel

**MIN-2 — `OperationsDashboardView` : `computedAtLabel` et `brokerReconciliation` non branchés**

- Fichier : `apps/web/app/(app)/admin/operations/OperationsDashboardView.tsx`, lignes 59-66
- Les props sont prévues dans `CashBalanceCard` (optionnelles) mais non passées depuis la view
- Impact : horodatage « Calculé il y a X min » et badge de cohérence courtier absents de l'UI — écart mineur vs spec §3.1

**MIN-3 — `OperationDetailDrawer` : absence de `Dialog.Description`**

- Fichier : `packages/ui/src/organisms/OperationDetailDrawer/OperationDetailDrawer.tsx`
- `Dialog.Content` porte `aria-labelledby` (Dialog.Title présent) mais pas `aria-describedby` vers une description
- Radix émet un avertissement console en dev (8 occurrences visibles dans le run Vitest de `OperationCancelModal`)
- Correction : ajouter `<Dialog.Description className="sr-only">` résumant l'action (ex. « Détail et options pour l'opération »)

**MIN-4 — `StepHeader` : indicateur d'étapes sans `role="progressbar"`**

- Fichier : `packages/ui/src/molecules/StepHeader/StepHeader.tsx`, ligne ~82
- Pills d'étape toutes `aria-hidden="true"`, libellé « Étape N / M » visible mais progression non exposée aux AT
- Recommandé par RGAA.md (onboarding doit exposer un `progressbar`)
- Correction : ajouter `role="progressbar"` + `aria-valuenow` + `aria-valuemax` sur le conteneur `<ol>`

**MIN-5 — Padding TypeCard : 20px au lieu de 22px vertical (spec §4)**

- Fichier : `packages/ui/src/molecules/OperationTypeSelector/OperationTypeSelector.tsx`, ligne ~38
- `p-5` (20px) vs spec `padding: 22px 20px`
- Impact visuel minimal (2px) — non perceptible à l'oeil nu

**MIN-6 — Avertissements Radix `Missing Description` dans OperationCancelModal**

- Composant : `OperationCancelModal` — 8 warnings Radix Dialog `aria-describedby={undefined}` dans les logs de test Vitest
- Non bloquant (test passes), mais à corriger avec la même correction que MIN-3 (Dialog.Description sr-only)

---

## Détail par dimension

### SQL — `supabase/tests/operations_rpc.sql`

Toutes les assertions de sécurité et de comportement métier sont vertes :

| Assertion                                                  | Code attendu    | Résultat |
| ---------------------------------------------------------- | --------------- | -------- |
| `record_operation` refusé pour non-staff                   | `42501`         | PASS     |
| `cancel_operation` refuse une op introuvable               | `no_data_found` | PASS     |
| buy incohérent (signe)                                     | `22023`         | PASS     |
| buy incohérent (montant)                                   | `22023`         | PASS     |
| buy sans quantity/unit_price                               | `22023`         | PASS     |
| contribution négative                                      | `22023`         | PASS     |
| cancel motif vide                                          | `22023`         | PASS     |
| double annulation                                          | `22023`         | PASS     |
| annulation op soldée                                       | `22023`         | PASS     |
| happy path complet (record/cancel/balance/positions/audit) | --              | PASS     |
| `get_club_positions_from_ops` cross-club fail-closed       | `42501`         | PASS     |

---

### E2E Playwright — `operations.spec.ts` (nouveau)

Spec créée dans `/Users/lionel/Documents/OMNIVENTUS/Projects/reseau-evolve-capital/apps/web/playwright/operations.spec.ts`

| Flow    | Description                                                      | Résultat |
| ------- | ---------------------------------------------------------------- | -------- |
| FLOW-A  | Membre non-staff → /admin/operations redirigé /dashboard         | PASS     |
| FLOW-B  | Isolation cross-club (RLS) — op club B invisible depuis club A   | PASS     |
| FLOW-C  | Dashboard P0-a — titre H1 + Solde espèces + 4 actions rapides    | PASS     |
| FLOW-D  | Saisie cotisation — assistant 3 étapes + confirmation étape 3    | PASS     |
| FLOW-E  | Liste /toutes — titres + bouton Nouvelle opération + ops seedées | PASS     |
| FLOW-F  | Annulation — drawer → modale motif obligatoire → succès          | PASS     |
| FLOW-F2 | Op soldée — parts_allocated IS NOT NULL en DB (contrainte RPC)   | PASS     |

**Notes d'exécution :**

- 2 corrections de spec apportées pendant le run (défauts de spec, pas bugs applicatifs) :
  - FLOW-B : cible `page.getByText('9 999', { exact: false }).not.toBeVisible()` au lieu de `page.content()` regex (évite les classes CSS Tailwind hash)
  - FLOW-D : `page.locator('select').first()` au lieu de `page.getByRole('combobox').first()` (le Radix Select du ClubSwitcher prend priority)
- Durée totale : 14,9s (workers=1, app sur :3001)
- Seed propre non requis (les fixtures sont insérées/nettoyées localement par spec)

**Cas non couverts par E2E (scope volontairement limité) :**

- Saisie achat + dividende (déléguée à l'unit Vitest — le flow formulaire est identique)
- Calcul précis du solde espèces (CashBalanceCard = somme attendue des cash_delta) — le FLOW-D vérifie l'affichage du bloc « Nouveau solde » post-saisie, la valeur exacte est couverte par les tests SQL RPC
- Annulation vérifiée visuellement (badge « Annulée », ligne barrée) — la modale se ferme et la succès Server Action est confirmée, mais la réouverture du drawer post-annulation pour vérifier le visuel est hors scope e2e

---

### Vitest — Récapitulatif

| Workspace       | Tests | Skipped | Failures | Note                                  |
| --------------- | ----- | ------- | -------- | ------------------------------------- |
| `@evolve/data`  | 256   | 29      | 0        | Tests RLS skippés — attendu (DB live) |
| `@evolve/ui`    | 766   | 0       | 0        | 79 fichiers                           |
| `@evolve/utils` | 39    | 0       | 0        | format.test.ts                        |

---

### Audit visuel statique

**Conformité estimée : 96 %** (cible : ≥97 %)

Points conformes confirmés :

- Tokens couleur : aucun hex en dur dans les composants, `data-positive`/`data-negative` corrects, jamais `#E93E3A` pour erreur/perte
- `formatEUR`/`formatEURWhole`/`signedEURWhole` de `@evolve/utils` — aucun `toLocaleString` dans les composants ops
- Libellés canoniques formulaire : « Titre », « Quantité », « Prix unitaire », « Montant », « Membre »
- Solde négatif en `text-text` (neutre), conforme spec §3.1 (JAMAIS coloré en rouge même si négatif)
- Op annulée : opacity-60 + grayscale + line-through (3 signaux visuels non-couleur)
- `OperationStatusTag` : `settled` = jaune token, `cancelled` = gris atténué sans brand-red
- EmptyState dans `OperationsTable`, fallback `—` dans `CashBalanceCard` (null-safety)
- Parité i18n fr/en : 120/120 clés namespace `admin.operations`

Divergences visuelles restantes (findings MIN-1 à MIN-5 ci-dessus, tous mineurs) :

- 2 props optionnelles non branchées (computedAtLabel, brokerReconciliation)
- 2 filtres OPS-205 manquants (Membre, Période)
- Padding TypeCard 20px vs 22px spec

---

### Régressions REGRESSIONS.md vérifiées

Les régressions touchant les zones modifiées (design-system/tokens, admin, formatters) ont été croisées :

| Régression                                             | Zone                     | Statut                                                                                             |
| ------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------- |
| R-032 — erreur sync en `data-negative` (jamais gris)   | `SyncBanner` non modifié | Non régressé                                                                                       |
| R-035 — cursor:pointer (RGAA 3.3, Tailwind v4)         | composants ops           | PASS — aucun `cursor` hardcodé, `role="button"` + `tabIndex` + `onKeyDown` sur les divs cliquables |
| R-004 — retard en rouge `data-negative` (jamais ambre) | tokens.css modifié       | PASS — nouveaux tokens ops ne perturbent pas les tokens cotisations                                |
| R-011 — dashboard vide (vue `member_quote_part`)       | dashboard non modifié    | Non régressé                                                                                       |

Aucune régression de REGRESSIONS.md réintroduite.

---

## Verdict

```
FAIL — 1 finding BLOQUANT (BLK-1)

Cause : OperationCancelModal/OperationCancelModal.tsx, ligne 131
  → <textarea> avec text-[14px] fixe (< 16px sur mobile)
  → RGAA règle 11 anti-zoom iOS / WCAG 1.4.4
  Correction : text-[16px] md:text-[14px] (1 ligne)

Conditions pour PASS :
  1. BLK-1 corrigé + vérifié
  2. Relancer `pnpm --filter @evolve/ui exec vitest run` → 0 failure
  3. Relancer cursor-pointer.spec.ts → 0 failure (régression R-035)

PASS possible en 1 itération : fix minimaliste, 1 fichier, 1 ligne.
```

### À faire après le fix (non bloquants)

1. **MAJ-1** — `FilterChip` : `min-h-10` → `min-h-11` (`OperationFilterBar.tsx:24`)
2. **MAJ-2** — `BrokerBadge` : retirer `aria-label` sur `<div>` sans `role` (`CashBalanceCard.tsx:~222`)
3. **MIN-3** / **MIN-6** — `Dialog.Description sr-only` dans `OperationDetailDrawer` et `OperationCancelModal`
4. **MIN-4** — `role="progressbar"` sur `StepHeader`
5. **MIN-1** — Brancher filtres Membre + Période dans `OperationsListView`
6. **MIN-2** — Passer `computedAt` + `brokerReconciliation` depuis `OperationsDashboardView`

### Spec E2E créée (à intégrer au suivi)

`apps/web/playwright/operations.spec.ts` — 7 flows, 391 lignes. Prête pour CI.

### Mise à jour FLOWS.md recommandée

Ajouter un **FLOW-019** (Opérations trésorier — P0-a dashboard + P0-b saisie + OPS-205 liste/annulation) avec criticité HAUTE, régressions BLK-1/MAJ-1 associées, spec `operations.spec.ts`.
