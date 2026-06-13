# Rapport QA — Feedback Widget : refonte upload d'images

**Date :** 2026-06-13
**Branche :** `feat/feedback-widget`
**Scope :** Remplacement du screenshot automatique (html2canvas) par un sélecteur de fichiers natif (jusqu'à 3 images) dans le `FeedbackSheet`. Flux : bouton dashed « Joindre » → input file natif → vignettes en grille + retrait individuel + compteur X/3 + hint max.
**Cycle :** synthèse qa-reporter — 4 sous-agents (qa-unit, qa-e2e, qa-visual, qa-a11y).

---

## 1. Verdict global

PASS

Aucune régression REGRESSIONS.md réintroduite. Aucun écart bloquant sur les tokens couleur, les états, l'accessibilité ou la logique métier. Une violation a11y (M-001 — hint max sans live region, WCAG 4.1.3) a été identifiée et corrigée dans ce cycle avant la clôture du rapport. Tous les gates sont verts.

---

## 2. Périmètre testé

**Branche :** `feat/feedback-widget` (diff depuis `main`).

**Fichiers impactés :**

| Périmètre                                              | Fichiers concernés                                                                                                                            |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Composant FeedbackSheet (`packages/ui`)                | `FeedbackSheet.tsx`, `FeedbackSheet.test.tsx`                                                                                                 |
| Server Action (`apps/web`)                             | `apps/web/lib/feedback/actions.ts`, `actions.test.ts`                                                                                         |
| Edge Function (`supabase/functions/feedback-dispatch`) | `handler.ts`, `__tests__/buildPrompt.test.ts`, `parseAiJson.test.ts`, `callAi.test.ts`, `resolveAiConfig.test.ts`, `dispatchFeedback.test.ts` |
| i18n                                                   | `apps/web/messages/fr.json` (bloc `feedback`), `apps/web/messages/en.json` (bloc `feedback`)                                                  |
| Spec E2E                                               | `apps/web/playwright/feedback.spec.ts`, `apps/web/playwright/cursor-pointer.spec.ts`                                                          |

**FLOWs vérifiés :**

| FLOW     | Intitulé                          | Criticité | Couverture                                    |
| -------- | --------------------------------- | --------- | --------------------------------------------- |
| FLOW-014 | Feedback Widget — upload d'images | MOYENNE   | `feedback.spec.ts` 1/1 — flow complet runtime |
| FLOW-013 | Transverse i18n & thème           | HAUTE     | Parité fr/en bloc `feedback` — PASS           |

**Régressions R-0XX dans la zone de vigilance :**

| Régression | Fichier(s) surveillés                                      | Raison de la vigilance                                      |
| ---------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| R-035      | `FeedbackSheet.tsx` (bouton « Joindre », boutons X, pills) | Tout bouton ou interactif ajouté peut briser cursor:pointer |

---

## 3. Scorecard par couche

### 3.1 Fonctionnel — Unit (Vitest + Deno)

| Suite                                                                                    | Fichier / Outil                         | Résultat     | Preuve                                         |
| ---------------------------------------------------------------------------------------- | --------------------------------------- | ------------ | ---------------------------------------------- |
| Gate baseline lint + typecheck (`pnpm turbo lint typecheck`)                             | 9 tâches turbo                          | VERT — 9/9   | FULL TURBO, 0 erreur, rapport qa-unit          |
| FeedbackSheet Vitest (`packages/ui`) — après correctif M-001                             | `FeedbackSheet.test.tsx`                | VERT — 28/28 | Rapport qa-unit (re-run post-fix M-001)        |
| Server Action Vitest (`apps/web`) — auth, upload, insert, fallback upload non fatal      | `apps/web/lib/feedback/actions.test.ts` | VERT — 8/8   | Rapport qa-unit                                |
| Parité i18n fr/en bloc `feedback`                                                        | `messages-parity.test.ts` ou équivalent | VERT — PASS  | 0 clé manquante côté FR ni EN, rapport qa-unit |
| Edge Function Deno — buildPrompt, parseAiJson, callAi, resolveAiConfig, dispatchFeedback | `feedback-dispatch/__tests__/`          | VERT — 20/20 | Rapport qa-unit                                |

**Note :** Le gate `make lint typecheck test` n'exécute pas les tests Deno (rappel README.md harnais). Les 20/20 Deno ont été lancés séparément via la CLI Deno — résultats fournis par qa-unit.

### 3.2 Fonctionnel — E2E (Playwright, `--workers=1`, port :3011)

| Spec                     | Résultat     | Détail                                                                                                                                                                                                             |
| ------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `feedback.spec.ts`       | VERT — 1/1   | Flow complet : login seed → ouverture dialog → sélection type → rédaction message → sélection fichiers → submit → état success confirmé en runtime. INSERT DB réel vérifié (trigger NO-OP en local, non bloquant). |
| `cursor-pointer.spec.ts` | VERT — 13/13 | 5 routes publiques + 8 routes auth ; bouton « Joindre » (dashed), boutons X de retrait, bouton Submit tous conformes R-035 ; 0 violation cursor:pointer.                                                           |

**Gotcha documenté :** le port :3001 répond en HTTP 426 (occupé par Cursor). Le run e2e a été exécuté sur :3011 via `E2E_BASE_URL=http://localhost:3011` conformément à la note de FLOW-014 dans FLOWS.md. Non imputable à la branche.

### 3.3 Visuel — Conformité maquette

Source de vérité : standalone-exports FeedbackSheet (toggle light/dark). Captures produites : 17 fichiers dans `docs/audits/shots/qa-feedback-upload-*`.

| Critère visuel                                                                                          | Light    | Dark            | Viewport       | Statut       |
| ------------------------------------------------------------------------------------------------------- | -------- | --------------- | -------------- | ------------ |
| État idle — bouton dashed visible, tokens corrects, sans débordement                                    | CONFORME | CONFORME        | Desktop+Mobile | OK           |
| État 2 images — vignettes nettes `object-cover`, compteur « 2/3 »                                       | CONFORME | CONFORME        | Desktop+Mobile | OK           |
| État 3 images — hint « 3 images maximum » visible, grille 3 colonnes, bouton masqué                     | CONFORME | CONFORME        | Desktop        | OK           |
| État success — pastille check 56 px, token `data-positive`, pas de `#E93E3A`                            | CONFORME | CONFORME        | Desktop+Mobile | OK           |
| État error — `bg-data-negative-50`, bordure `#C53030`, texte `--data-negative-strong`, jamais `#E93E3A` | CONFORME | N/A (1 capture) | Desktop        | OK           |
| Boutons X de retrait — cibles 44×44 px                                                                  | CONFORME | CONFORME        | Desktop+Mobile | OK           |
| Mention vie privée honnête (pas de claim floutage)                                                      | CONFORME | CONFORME        | Desktop        | OK — arbitré |
| 0 erreur applicative sur :3011                                                                          | —        | —               | Tous           | OK           |

**Écarts visuels :**

| Ref   | Nature     | Description                                                                                                                   | Décision                                                                              |
| ----- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| A-001 | ARBITRÉ    | Divergence vs ancienne maquette standalone sur l'état d'attachement (capture auto html2canvas supersédée par sélecteur natif) | Décision owner — nouvelle UX retenue, non pénalisé                                    |
| A-002 | ARBITRÉ    | Mention vie privée : « partagées avec l'équipe technique » au lieu du claim floutage de la maquette initiale                  | Formulation honnête conforme, non pénalisé                                            |
| I-001 | INFORMATIF | En local, le submit retourne parfois `ok:false` (trigger PG → pg_net → Vault vide) alors que l'INSERT réussit                 | Non bloquant. Comportement attendu en local. Vérifier en prod après peuplement Vault. |

### 3.4 Accessibilité (axe-core + vérifications manuelles)

| Point de contrôle                                                 | Résultat | Valeur / Preuve                                                      |
| ----------------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| axe-core état idle                                                | VERT     | 0 violation / 16 règles passées                                      |
| axe-core état idle + 2 images                                     | VERT     | 0 violation / 19 règles passées                                      |
| axe-core état success                                             | VERT     | 0 violation / 14 règles passées                                      |
| `role="dialog"` + `aria-labelledby` + `aria-describedby`          | OK       | Câblage Dialog confirmé                                              |
| Focus-trap dans la modale                                         | OK       | 6 Tab successifs dans la modale — focus ne s'échappe pas             |
| Touche Escape ferme le dialog                                     | OK       | Comportement natif Radix Dialog                                      |
| Pills : `role="group"` + `aria-label` + `aria-pressed`            | OK       | Confirmé par test unitaire                                           |
| Textarea : `htmlFor` / `id` associés                              | OK       | Association label explicite                                          |
| Boutons de retrait : `aria-label="Retirer l'image {n}"`, 44×44 px | OK       | Confirmé                                                             |
| Hint max : `role="status"` (M-001 — WCAG 4.1.3)                   | CORRIGE  | Live region ajoutée dans ce cycle ; 28/28 tests reconfirmés post-fix |
| `prefers-reduced-motion`                                          | OK       | `animate-spin motion-reduce:animate-none`                            |
| Mention vie privée honnête                                        | OK       | « partagées avec l'équipe technique » — sans claim de floutage       |

**Contrastes mesurés :**

| Élément                           | Ratio   | Niveau | Seuil requis |
| --------------------------------- | ------- | ------ | ------------ |
| Texte tertiaire (`text-text-ter`) | 5,58:1  | AA     | AA mini      |
| Pill accent sélectionnée          | 10,36:1 | AAA    | AA mini      |
| Bandeau error (`data-negative`)   | 7,30:1  | AAA    | AAA (alerte) |

Violation M-001 (WCAG 4.1.3 — hint max sans live region) : identifiée par qa-a11y, corrigée dans ce cycle (`role="status"` ajouté sur le hint max). Tests Vitest reconfirmés 28/28 après correctif. Verdict a11y final : PASS, 0 bloquant résiduel.

---

## 4. Régressions R-0XX

| Régression                                     | Test de garde                                | Résultat              | Preuve                                                                                       |
| ---------------------------------------------- | -------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| R-035 — cursor:pointer (Tailwind v4 preflight) | `apps/web/playwright/cursor-pointer.spec.ts` | OK — non réintroduite | 13/13 VERT — bouton « Joindre », boutons X de retrait et pills tous conformes cursor:pointer |

Aucune autre régression de REGRESSIONS.md n'est dans la zone de vigilance de cette branche. Les modifications sont strictement limitées à `FeedbackSheet`, la Server Action feedback et la Edge Function feedback-dispatch.

---

## 5. Ecarts et corrections

### Bloquants

Aucun.

### Mineur résolu en cycle (M-001)

**M-001 — Hint max sans live region (WCAG 4.1.3)**

- Fichier incriminé : `packages/ui/src/organisms/FeedbackSheet/FeedbackSheet.tsx`
- Symptôme : le texte « 3 images maximum » apparaissant à l'ajout de la 3e image n'était pas annoncé aux technologies d'assistance (absence de live region).
- Correction appliquée : ajout de `role="status"` sur l'élément portant le hint max.
- Vérification : tests Vitest reconfirmés 28/28 post-correctif ; axe-core 0 violation sur les 3 états.

### Informatif (non bloquant)

**I-001 — Submit `ok:false` en local (Vault vide)**

- Comportement : le submit retourne parfois `ok:false` alors que l'INSERT `feedback` réussit. Cause : le trigger PG `feedback_dispatch` appelle `pg_net` → Edge Function → Vault ; le secret `feedback_dispatch_url` est absent en local → le trigger est NO-OP par construction.
- Impact prod : nul si les secrets Vault sont peuplés avant activation. Voir action owner P1 ci-dessous.
- Non imputable à la branche : comportement documenté dans la migration 036 et dans FLOW-014.

### Arbitrés (non pénalisés)

**A-001 — Ancienne maquette capture automatique**
Divergence vs maquette standalone html2canvas : la décision owner de remplacer la capture auto par un sélecteur natif rend la maquette précédente caduque. Non pénalisé.

**A-002 — Mention vie privée honnête**
La formulation « partagées uniquement avec l'équipe technique » remplace volontairement le claim de floutage automatique jamais implémenté. Conforme à la règle VISUAL.md (arbitrage documenté). Non pénalisé.

---

## 6. Dettes et actions owner

Les dettes ouvertes de `docs/qa/README.md` restent valides et ne sont pas aggravées par cette livraison.

| Ref | Priorité | Nature      | Description                                                                                                                                                                                        | Owner      |
| --- | -------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| P1  | HAUTE    | Prod        | Peupler le secret Vault `feedback_dispatch_url` sur le projet prod (`kiwcjtilwihioswdsjjv`) pour activer le fan-out IA → Discord / Notion / GitHub / Brevo. Sans cette étape le trigger est NO-OP. | Owner prod |
| P2  | MOYENNE  | Storybook   | Corriger la story dark `FeedbackSheet` : appliquer `data-theme="dark"` sur `document.documentElement` (Radix Portal monte sur `<body>`, hors du wrapper decorator). Non bloquant prod.             | Lead UI    |
| P3  | BASSE    | A11y UX     | Affiner `aria-label` du bouton déclencheur de « Retour » vers « Donner un retour » pour éviter l'ambiguïté avec une navigation arrière en lecteur d'écran. 0 violation axe actuelle.               | Lead UI    |
| —   | DETTE    | Onboarding  | Store onboarding non persisté : un reload complet en plein onboarding perd tél/adresse en cours. Follow-up `persist` sessionStorage + reset-fin + clé par-user (préexistant, non aggravé).         | Follow-up  |
| —   | DETTE    | Cotisations | Cible tactile cellules cotisation 24 px < 44 px (R-005 / debt). Non aggravé.                                                                                                                       | Follow-up  |

---

## 7. Verdict final

PASS

- Gate lint + typecheck : VERT (9/9 tâches).
- Gate test unitaire : VERT — 28/28 (FeedbackSheet), 8/8 (Server Action), 20/20 (Deno Edge Function), parité i18n PASS.
- E2E : VERT — feedback 1/1, cursor-pointer 13/13.
- Visuel : conforme light/dark/desktop/mobile, 17 captures produites dans `docs/audits/shots/`.
- A11y : 0 violation bloquante résiduelle. M-001 (WCAG 4.1.3) corrigé dans le cycle.
- Régressions REGRESSIONS.md : R-035 non réintroduite. Aucune autre régression dans la zone de vigilance.
- Aucun flow HAUTE criticité régressé.

La seule action bloquante avant mise en prod réelle du fan-out est le peuplement du secret Vault (P1 owner prod) — sans rapport avec la qualité du code livré sur la branche.

---

## Suggestions Journal des retours (docs/qa/README.md)

| Date       | Retour                                                                                    | Origine | Suggestion                                                                 |
| ---------- | ----------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------- |
| 2026-06-13 | Hint max FeedbackSheet sans live region (WCAG 4.1.3) — `role="status"` manquant           | QA a11y | Ajouter au Journal. Bug corrigé dans le cycle → candidat R-036 si récidive |
| 2026-06-13 | Submit `ok:false` en local (Vault vide) alors que l'INSERT réussit — comportement attendu | QA e2e  | Ajouter au Journal comme gotcha env local, pas comme régression            |
