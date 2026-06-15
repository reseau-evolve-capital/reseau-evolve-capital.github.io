# Résolution — Retours premiers testeurs prod (2026-06-15)

> **Backlog source** : [`RETOURS-TESTEURS-PROD-2026-06-15.md`](./RETOURS-TESTEURS-PROD-2026-06-15.md).
> **Branche** : `fix/resolution-retours-prod` (depuis `origin/main` = `72061c2`). **Non poussée.**
> **Périmètre traité** : RT-01, RT-02, RT-03, RT-04, RT-05, RT-07, RT-08, RT-10, RT-11. **Reportés (non traités)** : RT-06, RT-09.
> **Gate baseline** (avant toute modif) : `make lint typecheck test` VERT (lint 2/2, typecheck 7/7, tests verts). Dette pré-existante notée : ~21 tests `skipped` dans `@evolve/data` (non liés, hors responsabilité).
> **Gate final intégré** : `make lint typecheck test` VERT — utils 62, ui 480, data 194 (21 skipped), web 379 ; + Deno sync 38/38.

---

## ⚠️ À LIRE EN PREMIER — action prod survenue pendant la session

Lors de RT-03, la cible `make db-migrate` (= `supabase db push`) **pousse vers le projet lié = `kiwcjtilwihioswdsjjv` (PROD)**, pas vers le local. La **migration `037` a donc été appliquée en production** (RPC `record_attestation_ref`). C'est une fonction **additive, idempotente, `SECURITY DEFINER` scopée `auth.uid()`**, **dormante** (aucun code déployé ne l'appelle tant que `apps/web` n'est pas redéployé) → **impact nul sur l'existant**. Vérif : `supabase migration list` montre Local = Remote alignés `016→037` (donc 034/035/036 étaient déjà en prod ; seule 037 est nouvelle). **Rien à refaire côté migration prod pour RT-03** — mais à valider consciemment. Le local applique les migrations via `make db-reset` (pas `db-migrate`).

---

## RT-04 — Faux popup « génération échouée » après succès — `fix(web)` 47b96a4

- **Changé** : `window.open(url,'_blank','noopener')` renvoyait `null` même en succès → faux toast d'erreur persistant. Extrait un helper pur `openAttestation()` (sans `noopener`) ; l'erreur ne s'affiche que si l'ouverture est réellement bloquée. Toast succès conservé, ouverture synchrone iOS préservée.
- **Fichiers** : `apps/web/lib/attestation/openAttestation.ts` (nouveau), `apps/web/app/(app)/contributions/ContributionsView.tsx` (downloadAttestation recâblé).
- **Tests ajoutés** : `apps/web/lib/attestation/openAttestation.test.ts` (3 tests : handle truthy→opened, null→blocked, garde-fou « pas de noopener »).
- **Gate** : ✅ web 359→ vert (openAttestation 3/3) ; `make lint typecheck test` EXIT 0.
- **Vérif runtime** : logique couverte par unit ; ouverture réelle du PDF + toast succès à confirmer en navigateur (faible risque).
- **Reste owner** : —

## RT-02 — Bouton (i) en chevauchement sur le « % » (cartes mobiles) — `fix(ui)` fdbc3cf

- **Changé** : InfoTip de perf en absolu (`right-3 top-11`, hit-zone 44×44) recouvrait le `%`. Ajout `pr-7` sur la span `%` pour libérer la colonne de l'(i).
- **Fichiers** : `packages/ui/src/molecules/DataRow/DataRow.tsx`.
- **Tests ajoutés** : `DataRow.test.tsx` (réservation d'espace `pr-*`, cas `-12,34 %`) ; story `PerfInfoNoOverlap` (play géométrique : `pctRect.right <= infoRect.left`).
- **Gate** : ✅ `@evolve/ui` 471/471 ; `make` EXIT 0.
- **Vérif runtime** : light/dark/mobile à confirmer en Storybook (story dédiée) ; `cursor-pointer.spec.ts` → voir section QA finale.
- **Reste owner** : —

## RT-05 — Cotisations : alerte de retard « 0,00 € » — `fix(web)` 28f4e49

- **Changé** : dérivation serveur `deriveAmountDue()` = (mois `late` post-adhésion et ≤ mois courant) × `clubs.min_contribution` quand `amount_due` source ≤ 0 ; sinon valeur source. `getContributionsData` lit `clubs.min_contribution`. Garde-fou affichage : `lateAlert.titleNoAmount` si montant ≤ 0 (jamais « 0,00 € »).
- **Fichiers** : `apps/web/lib/data/contributionStatus.ts` (deriveAmountDue), `contributions.ts` (lecture club), `ContributionsView.tsx` (bandeau conditionnel), `messages/{fr,en}.json` (`lateAlert.titleNoAmount`).
- **Tests ajoutés** : `contributionStatus.test.ts` (+10 : source>0 intacte, 0/1/2/3 mois `late`, bornes pré-adhésion/futur, min_contribution=0).
- **Gate** : ✅ contributionStatus 26/26 ; `make` EXIT 0 (web 369).
- **Vérif runtime** : bandeau `late` avec/sans montant — light/dark/EN à confirmer.
- **Reste owner** : —

## RT-03 — QR de l'attestation → « référence inconnue » — `fix(web)` 1f986e4

- **Changé** : l'attestation on-demand ne persistait jamais sa réf. Ajout RPC `record_attestation_ref` (migr **037**, `SECURITY DEFINER`, scoping `auth.uid()`, upsert idempotent sur `attestation_sends`) appelée par la route (sans service-role, non bloquante). Base URL du QR sécurisée (`NEXT_PUBLIC_SITE_URL ?? url.origin`).
- **Fichiers** : `supabase/migrations/037_attestation_ondemand_ref.sql` (nouveau), `apps/web/app/api/attestation/detention/route.ts`, `packages/data/src/supabase/types.gen.ts` (régénéré `--local`), `docs/security/rls-audit.md`.
- **Tests ajoutés** : `packages/data/src/supabase/__tests__/rls-isolation.test.ts` (+2 : un membre ne persiste que SA réf, refus 42501 sur membership tierce) ; `apps/web/playwright/attestation.spec.ts` (round-trip réf persistée → vérifiable) ; `verifier.spec.ts` 2/2 (authentique / inconnue).
- **Gate** : ✅ isolation RLS 21/21 ; e2e verifier 2/2 + attestation round-trip PASS ; typecheck/lint propres.
- **Vérif runtime** : round-trip e2e prouvé en local (réf `REC-202603-XXXX` → « Document authentique »).
- **Reste owner** : ⚠️ migr 037 **déjà appliquée en prod** (voir encadré haut) ; re-scanner un vrai QR d'attestation on-demand sur l'env déployé (doit afficher « authentique ») ; confirmer `NEXT_PUBLIC_SITE_URL` posée sur Vercel ; **redéployer `apps/web`** pour que la route appelle la RPC.

## RT-07 — Blog vitrine : og:image non affiché sur WhatsApp — `fix(vitrine)` 6514911

- **Changé** : og:image pointait sur l'original brut (~1,16 Mo, rejeté WhatsApp), sans balises dimensions. Nouveau helper `getStrapiOgImage` (additif : `large`→`medium`→`small`→original) ; `generateMetadata` passe `{url, secureUrl, width, height, type:'image/jpeg'}` → Next émet `og:image:width/height/type/secure_url`. **Zéro refacto vitrine.**
- **Fichiers** : `apps/vitrine/src/lib/api.ts` (helper), `blog/[slug]/page.tsx` (metadata), `apps/vitrine/src/lib/api.test.ts` (1er test du workspace), `apps/vitrine/tsconfig.json` (exclude des tests du build SSG).
- **Tests ajoutés** : `api.test.ts` (7 : sélection large/medium/small/original, null, préfixe relatif/absolu).
- **Gate** : ✅ vitrine test 7/7, typecheck + lint propres. Build NON lancé (exige Strapi up).
- **Vérif runtime** : non testable en CI (SSG) → vérif owner.
- **Reste owner** : **rebuild + redeploy vitrine avec Strapi up** (`make vitrine-export`/`vitrine-deploy`) ; re-scrape **Facebook Sharing Debugger** ; test WhatsApp réel (`?v=2`, cache crawler ~7 j).

## RT-08 — Section « Liquidité » = ESPECES — `fix(supabase)` 7e3d3f7 + `fix(web)` c833a02

- **Changé** : la ligne ESPECES porte sa valeur en col B (pas col G) → classée position invisible. Parser `parsePortefeuille` détecte le label ESPECES (normalisé accents/casse), lit la valeur en col B, la projette en agrégat (`symbol` vidé), **aucune valeur en dur**. UI : section « Liquidité » unique (montant + ou −, token dataviz pour négatif, jamais rouge brand) ; soldes court/long terme masqués.
- **Fichiers** : `supabase/functions/sync/sheetParsers.ts`, `apps/web/lib/data/portfolio.ts` (extraction liquidité + filtres), `PortfolioView.tsx` (section Liquidité), `messages/{fr,en}.json` (`portfolio.liquidity.*`).
- **Tests ajoutés** : Deno `sync.test.ts` (+3 parsePortefeuille : ESPECES→agrégat, négatif, label accentué) ; `portefeuille.mapper.test.ts` (+2) ; `portfolio.test.ts` (balanceAggregates + extraction liquidité).
- **Gate** : ✅ Deno 38/38, mapper 10, portfolio 21, parité i18n ; `make` EXIT 0.
- **Vérif runtime** : light/dark/mobile (Liquidité + et −) à confirmer ; valeur réelle visible seulement après re-sync.
- **Reste owner** : **redéployer l'Edge Function `sync` + re-sync** (le parsing ESPECES ne prend effet en prod qu'après ; les agrégats actuels viennent de l'ancien parsing).

## RT-10 — Wording « Remboursement en cours » ambigu — `fix(web)` c833a02 (bundle RT-08)

- **Changé** : tooltip InfoTip explicatif « Sommes en cours de remboursement à un ou plusieurs membres sortants. » ; masquage des agrégats à `market_value == null` (supprime le « — » trompeur).
- **Fichiers** : `apps/web/app/(app)/portfolio/PortfolioView.tsx`, `messages/{fr,en}.json` (`portfolio.reimbursement.*`).
- **Tests ajoutés** : couvert par les tests d'extraction/affichage `portfolio.test.ts` + parité i18n.
- **Gate** : ✅ (avec RT-08).
- **Vérif runtime** : tooltip (tap PWA + clavier + survol, cible ≥44px), absence du « — », light/dark à confirmer.
- **Reste owner** : (avec RT-08).

## RT-01 — PWA iOS : re-login forcé (Option B = copy/UX) — `fix(ui)` a9d7914

- **Changé** : sur iOS Safari la PWA démarre sans session cookie (WebKit) → 1er lancement sur `/login`. Encart de réassurance dans la modale d'install iOS (`firstLoginNote`) : « code une fois, puis tu restes connecté ». Copy via props (zéro i18n dans `packages/ui`), câblée aux 2 call-sites. Aucune logique de session/handoff modifiée.
- **Fichiers** : `packages/ui/src/organisms/IosInstallInstructions/IosInstallInstructions.tsx` (+ stories + test), `apps/web/components/pwa/InstallBannerMount.tsx`, `app/(app)/profil/InstallSection.tsx`, `messages/{fr,en}.json` (`pwa.modal.firstLoginNote`).
- **Tests ajoutés** : `IosInstallInstructions.test.tsx` (note visible étapes 1 & 2) ; story mise à jour.
- **Gate** : ✅ `@evolve/ui` 472/472, typecheck web (call-sites) OK.
- **Vérif runtime** : **device owner requis** — non reproductible en Chromium (contrainte WebKit).
- **Reste owner** : valider sur un **vrai iPhone Safari** (install → 1er lancement → OTP 6 chiffres → session persiste).

## RT-11 — Portefeuille : vue par titre + switch — `feat(ui)` f070736 + `feat(web)` 14a3c3a

- **Changé** : extraction d'un `SegmentedToggle` partagé (`packages/ui`) réutilisé par le portefeuille ET le dashboard (rewire de `DashboardEvolutionChart`, iso-comportement). `buildPortfolio` expose `allocationByTitle` (regroupement par nom, tri desc, top 8 + « Autres »). Switch « Par secteur / Par titre » au-dessus du donut (secteur par défaut) ; `AllocationDonut` swappe la data.
- **Fichiers** : `packages/ui/src/molecules/SegmentedToggle/*` (nouveau + barrel), `DashboardEvolutionChart.tsx` (rewire), `apps/web/lib/data/portfolio.ts`, `PortfolioView.tsx`, `messages/{fr,en}.json` (`portfolio.allocation.*`).
- **Tests ajoutés** : `SegmentedToggle.test.tsx` (8) + `.stories.tsx` (4 play, jest-axe) ; `portfolio.test.ts` (+ buildAllocationByTitle : tri, top N + Autres) ; DashboardEvolutionChart 17 tests existants verts (iso-comportement).
- **Gate** : ✅ `@evolve/ui` 480/480, web 379 ; `make` EXIT 0.
- **Vérif runtime** : bascule secteur↔titre, light/dark/mobile, focus visible — à confirmer ; `cursor-pointer.spec.ts` → section QA.
- **Reste owner** : — (note mineure de polish : le donut colore le bucket « Autres » en neutre uniquement sur le label FR exact ; en EN « Other » prend une couleur de palette — cosmétique, follow-up éventuel).

---

## QA runtime / e2e (agent qa-e2e, env Supabase local + seed)

- ✅ **`cursor-pointer.spec.ts` : 13/13 PASS** (mandat CLAUDE.md après RT-02/RT-11) — aucune violation `cursor:pointer` sur les 13 routes (5 publiques + 7 auth + onboarding).
- ✅ `portfolio.spec.ts` : 5/5 (donut, positions, filtre, tri, modale, redirect — rend bien avec Liquidité RT-08/RT-10 + switch RT-11).
- ✅ `dashboard.spec.ts` : 6/6.
- ⚠️ `dashboard-v2.spec.ts` : 18/20 — **2 échecs PRÉ-EXISTANTS sur `main`** (prouvé : `git show f070736/14a3c3a -- DashboardViewV2.tsx` vide ; spec + `HeroDetailDialog.tsx` identiques sur `72061c2`). Cause = sélecteurs de spec trop larges : ligne 306 `getByText('Ta quote-part')` sans `exact:true` (matche aussi le `<p>` variationInfo) ; ligne 342 `getByRole('button', {name:/Ta quote-part/i})` capture le hero mobile + desktop. **Hors lot** (zone dashboard V2 / RT-06 reporté) → dette e2e à corriger séparément (fix : `exact:true` + scoper le query). Non régressé par cette branche.

## Synthèse « reste owner » (consolidée)

1. **RT-03** : migr 037 **déjà en prod** (à valider) ; redéployer `apps/web` ; vérifier `NEXT_PUBLIC_SITE_URL` Vercel ; re-scanner un vrai QR.
2. **RT-08/RT-10** : **redéployer l'Edge Function `sync` + re-sync** (parsing ESPECES effectif après).
3. **RT-07** : **rebuild/redeploy vitrine** (Strapi up) + FB Sharing Debugger + test WhatsApp réel.
4. **RT-01** : test sur **vrai iPhone Safari**.
5. Pousser la branche `fix/resolution-retours-prod` (sur demande) + ouvrir la PR vers `main`.
