# REGRESSIONS.md — Bugs corrigés à NE PAS réintroduire

> **Source de vérité du QA.** Chaque bug corrigé y est figé avec son test de garde + les zones de vigilance.
> L'agent `qa-orchestrator` croise les `git diff` récents avec les **Vigilance** ci-dessous pour cibler les tests.
> **RÈGLE :** une session ne peut PAS être marquée « OK » si un test listé ici échoue.
>
> Livré sur `main` (sprint E-QA1 + suivi onboarding, 2026-06-06). Réfs flows : [FLOWS.md](./FLOWS.md).

---

## Synchronisation Sheets (BLOQUANT — conditionne les données)

### R-029 · Le sync réinitialise le rôle trésorier en `member`

**Corrigé :** 2026-06-06 (`fix(sheets)` + `fix(supabase)` rôles fail-safe).
**Symptôme :** après chaque sync, l'import Base écrivait `role='member'` pour tous → trésorier/président perdus.
**Fix :** rôles **dérivés de PARAMETRAGES** (matching nom normalisé) ; Base ne pose plus le rôle ; réconciliation fail-safe.
**Test :** `supabase/functions/sync/__tests__/sync.test.ts` (« rôles dérivés », « idempotents », « ex-dirigeant → member »).
**Vigilance :** `supabase/functions/sync/index.ts`, `packages/data/src/sheets/mappers/base.mapper.ts` + `parametrages.mapper.ts`, `packages/data/src/types/sheets.ts` (`MembershipUpsert` sans `role`).

### R-030 · `network_admin` rétrogradé par le sync

**Corrigé :** 2026-06-06.
**Symptôme :** un network_admin **membre de la feuille Base** était remis à `member`.
**Fix :** la réconciliation ne rétrograde QUE president/treasurer ; Base ne touche plus le rôle (update préserve l'existant).
**Test :** `sync.test.ts` (« network_admin préservé », « network_admin membre de la feuille Base préservé »).
**Vigilance :** toute modif de l'upsert memberships ou de la réconciliation des rôles dans `index.ts`.

### R-010 · Positions (et agrégats) fantômes accumulées

**Corrigé :** 2026-06-06.
**Symptôme :** l'upsert positions n'effaçait jamais les disparues → la page portfolio montrait plus de lignes que la matrice.
**Fix :** réconciliation `is_active=false` des lignes au `synced_at` antérieur au run (positions ET `portfolio_aggregates`). Lecture filtrée `is_active=true`.
**Test :** `sync.test.ts` (« position fantôme désactivée », « agrégats persistés + fantôme désactivé »).
**Vigilance :** `index.ts` (bloc Portefeuille), `apps/web/lib/data/portfolio.ts` (filtre is_active).

### R-031 · Aucun feedback après « Synchroniser »

**Corrigé :** 2026-06-06 (`feat(web)` feedback de sync).
**Symptôme :** clic « Synchroniser » sans toast succès/erreur, page non rafraîchie.
**Fix :** `/api/sync` lit `data.success/errors/warnings` ; `useSyncStatus` centralise toast + invalidation.
**Test :** `apps/web/lib/data/*` + vérif runtime. **Vigilance :** `apps/web/app/api/sync/route.ts`, `lib/hooks/useSyncStatus.ts`.

### R-032 · Message d'erreur sync pas assez visible

**Corrigé :** 2026-06-06.
**Symptôme :** erreur sync affichée en gris discret (`text-text-ter`).
**Fix :** token `data-negative` (jamais brand `#E93E3A`). **Vigilance :** `packages/ui/src/organisms/SyncBanner` + `Banner`.

---

## Portefeuille

### R-006 · Total portefeuille faux (somme des positions)

**Corrigé :** 2026-06-06 (`feat(web)` total agrégat).
**Symptôme :** total = somme live des positions ≠ valeur matrice (ex. attendu 721 100,78 €).
**Fix :** total = ligne d'agrégat **« Portefeuille »** (matchée par LABEL, persistée dans `portfolio_aggregates`, migration 029), fallback somme live.
**Test :** `apps/web/lib/data/portfolio.test.ts`. **Vigilance :** `portfolio.ts` (`totalFromAggregates`), `portefeuille.mapper.ts`, migration `029`.

### R-007 · Lignes d'agrégat manquantes (Provision, Soldes)

**Corrigé :** 2026-06-06. **Fix :** capturées (`mapAggregateRows`) + persistées + encart « Provisions et soldes ». **Vigilance :** `portefeuille.mapper.ts`, `index.ts`, `PortfolioView.tsx`.

### R-008 · « Typologie du titre » non exploitée

**Corrigé :** 2026-06-06. **Symptôme :** `positions.typologie` en DB mais droppée côté app. **Fix :** ajoutée au SELECT/type/filtre (Offensif/Défensif/Autres). **Vigilance :** `portfolio.ts`, `packages/types/src/portfolio.ts`, `FilterBar.tsx`.

### R-009 · Bandeau sync mobile ne flippe pas en dark

**Corrigé :** 2026-06-06. **Symptôme :** `bg-neutral-100/200` (non thémés) restent clairs en dark. **Fix :** tokens sémantiques (`bg-card-sub`/`bg-border`). **Vigilance :** `packages/ui/src/organisms/Banner/Banner.tsx` (variante `sync`).

---

## Cotisations

### R-001 · Carte « Valeur nette détenue » absente

**Corrigé :** 2026-06-06. **Symptôme :** `contributions.net_market_value` rempli en DB mais jamais affiché. **Fix :** carte distincte au-dessus de « Total cotisé ». **Test :** `apps/web/lib/data/contributions.test.ts`. **Vigilance :** `contributions.ts`, `ContributionsView.tsx`.

### R-001b · idem côté admin (vue d'un membre) — `getClubMembers` + `AdminCotisationsView`.

### R-002 · « Nombre de mois cotisés » = 0

**Corrigé :** 2026-06-06. **Symptôme :** colonne source `#ERROR!` → null → 0 alors que la frise montre des mois payés. **Fix :** dérivé du compte réel des `contribution_months` `paid`. **Vigilance :** `contributions.ts` (`monthsCount`).

### R-003 · Frise jusqu'à 2051 (années futures vides)

**Corrigé :** 2026-06-06. **Fix :** borne `year <= année courante`. **Vigilance :** `contributions.ts` (`buildTimelineYears`), `admin.ts` (`getClubContributionsTimeline`).

### R-004 · Couleur « retard » en ambre au lieu de rouge

**Corrigé :** 2026-06-06. **Fix :** état `late` → `data-negative` (+ token `--data-negative-strong` pour le texte AAA). **Vigilance :** `CotisationMonth.tsx`, `ContributionsTimeline.tsx`, `ContributionsView.tsx`, `tokens.css`.

### R-005 · (Dette) cible tactile cellules cotisation 24px < 44px

**Statut :** atténué (zone cliquable ≥44px via padding) — surveiller en a11y. **Vigilance :** `CotisationMonth.tsx`.

---

## Dashboard

### R-011 · Dashboard VIDE à la 1ère connexion (« Données non disponibles »)

**Corrigé :** 2026-06-06 (`feat(supabase)` migration 030). **Symptôme :** la vue MATÉRIALISÉE `member_quote_part` (keyée user_id, rafraîchie au sync seulement) restait obsolète après le re-key login → dashboard vide jusqu'au prochain sync.
**Fix :** `member_quote_part` **MV → VUE normale `security_invoker`** (toujours à jour, suit la cascade re-key, RLS native). `refresh_member_quote_part` = no-op.
**Vigilance :** **NE JAMAIS** `REFRESH MATERIALIZED VIEW member_quote_part` (c'est une VUE). `supabase/migrations/030`, `apps/web/lib/data/dashboard.ts`, helpers e2e (`global-setup`).

### R-012 · « Synchronisé il y a 2h » figé / incohérent desktop-mobile

**Corrigé :** 2026-06-06. **Fix :** source unifiée sur `clubs.synced_at`. **Vigilance :** `dashboard.ts`, `(app)/layout.tsx`, `DashboardView.tsx`.

---

## Admin membres

### R-013a · Wording « in arrears » / « impayé » peu clair

**Corrigé :** 2026-06-06. **Fix :** « À régulariser » / « membres avec cotisation à régulariser ». **Test :** `apps/web/playwright/admin.spec.ts`. **Vigilance :** `messages/{fr,en}.json` (`admin.dashboard.*`, `admin.members.filterUnpaid`).

### R-013b · Membre sorti affiché « Membre »

**Corrigé :** 2026-06-06. **Fix :** badge **« Ancien membre »** présentationnel (PAS d'ajout à l'enum `member_role`). **Vigilance :** `packages/ui/src/organisms/MembersList/MembersList.tsx`.

### R-013c · Pas de compte de résultats par filtre

**Corrigé :** 2026-06-06. **Fix :** Tous/Actifs/Sortis suffixés du compte. **Vigilance :** `MembersView.tsx`.

### R-026 · Contraste badge Accès (#68ac90) < AA (2.46:1)

**Corrigé :** 2026-06-06. **Symptôme :** `opacity-60` sur le badge « Actif » d'un sorti faisait chuter le vert `data-positive` sous AA.
**Fix :** opacité retirée du badge (la ligne grisée porte l'atténuation). **Test :** `access.spec.ts` (a11y `/admin/members` axe). **Vigilance :** `MembersList.tsx`, `Avatar`/badges, toute opacité sur du texte coloré.

---

## Auth & Onboarding

### R-014 · Magic link « expiré au 1er clic, marche au 2e »

**Corrigé :** 2026-06-06 (`fix(web)` magic link serveur). **Cause racine :** flux **PKCE** (`?code=`) non géré — l'ancien `VerifyClient` lisait un `token_hash` absent côté client.
**Fix :** échange déplacé dans une **route handler serveur** `(auth)/login/verify/route.ts` (gère PKCE + OTP invitation), idempotent.
**Test :** `auth.spec.ts`. **Vigilance :** `verify/route.ts`, `middleware.ts`, `api/auth/magic-link/route.ts`.

### R-015 · Email magic link non brandé + code OTP affiché

**Corrigé :** 2026-06-06. **Symptôme :** template Supabase par défaut EN (« Alternatively, enter the code »).
**Fix :** template statique brandé **lien-only** (`supabase/templates/magic_link.html`) en local ; Auth Hook Brevo localisé fr/en pour la prod.
**Vigilance :** `supabase/config.toml` (`[auth.email.template.magic_link]`), `supabase/functions/send-email/`, `MagicLinkEmail.tsx`.

### R-016 · Submit login sans transition

**Corrigé :** 2026-06-06. **Fix :** bouton « Envoi du lien… » + hint `aria-live`. **Vigilance :** `LoginScreen.tsx`.

### R-017 · Onboarding jamais affiché à la 1ère connexion

**Corrigé :** 2026-06-06. **Cause :** aucun guard serveur. **Fix :** guard `middleware.ts` (lit `onboarding_completed`). **Test :** `auth.spec.ts`. **Vigilance :** `middleware.ts`.

### R-018 · Clic « Profil » → /onboarding « page not found »

**Corrigé :** 2026-06-06. **Fix :** vraie page `(app)/profil/` + `AppChrome` recâblé. **Vigilance :** `AppChrome.tsx`, route `/profil`.

### R-019 · Champs onboarding non pré-remplis

**Corrigé :** 2026-06-06. **Symptôme :** prénom/nom/tél/adresse vides alors qu'en DB. **Cause :** store zustand vide, jamais hydraté.
**Fix :** RSC lit `users` (`getOnboardingDefaults`, gotcha `firstname`=nom complet → fallback `full_name`). **Vigilance :** `step-1/page.tsx` + `Step1Form.tsx`, `step-2`, `lib/data/profile.ts`.

### R-020 · L'onboarding ÉCRASE le téléphone/adresse synchronisés

**Corrigé :** 2026-06-06. **Symptôme :** `phone: body.phone ?? null` écrasait la valeur Base par du vide (store vide soumis).
**Fix :** route **défensive** — n'écrit phone/address/avatar que si non-vide. **Test :** `api/onboarding/profile/route.test.ts`. **Vigilance :** `api/onboarding/profile/route.ts`.

### R-021 · Aperçu avatar absent à l'upload (+ CSP)

**Corrigé :** 2026-06-06. **Fix :** aperçu **optimiste** (`URL.createObjectURL`) + **CSP `img-src` += `blob:` + origine Supabase Storage** (sinon bloqué). **Vigilance :** `step-2/Step2Form.tsx`, `lib/upload/avatar.ts`, `next.config.ts` (img-src).

### R-021b · Avatar déformé / non affiché — **Fix :** `Avatar` `object-cover` + fallback initiales `onError`. **Vigilance :** `packages/ui/src/atoms/Avatar/Avatar.tsx`.

### R-022 · Lien charte/CGU → `/legal/charter` 404

**Corrigé :** 2026-06-06. **Fix :** pages `/legal/charter` + `/legal/privacy` créées (brandées, i18n, publiques). **Vigilance :** `app/legal/*`, `step-3/Step3Form.tsx` (linkHref).

### R-025 · Perte de l'état onboarding si lien légal en même onglet

**Corrigé :** 2026-06-06. **Symptôme :** cliquer « lire la charte » (nav pleine page) vidait le store → avatar/tél perdus.
**Fix :** liens légaux en **nouvel onglet** (`ConsentRow linkTarget="_blank"`). **Vigilance :** `ConsentRow.tsx`, `Step3Form.tsx`.
**Dette restante :** un **reload** complet en plein onboarding perd encore tél/adresse en cours (store non persisté) → follow-up `persist` sessionStorage avec reset-fin + clé par-user.

---

## Invitations

### R-027 · Inviter un email hors club accepté

**Corrigé :** 2026-06-06 (migration 031). **Fix :** `admin_create_invitation` exige que l'email soit déjà membre du club. **Vigilance :** `supabase/migrations/031`, `app/(app)/admin/actions.ts`.

### R-028 · Révocation no-op si invitation acceptée

**Corrigé :** 2026-06-06. **Fix :** révocation couvre `accepted` → verrouille l'accès. **Vigilance :** migration 031.

---

## Transverse / Infra

### R-023 · Template email auth non rechargé sans `supabase stop && start`

**Statut :** GOTCHA documenté. **Symptôme :** après modif `[auth.email.template.*]`, `make db-reset` ne recharge PAS la config auth → ancien template.
**Action :** `supabase stop && supabase start -x vector,logflare`. **Vérif :** vider Mailpit → POST `/api/auth/magic-link` → sujet « Ton lien de connexion à Evolve Capital » sans code.

### R-024 · Temps relatif non traduit en EN

**Corrigé :** 2026-06-06. **Fix :** `formatRelativeTime` reçoit la locale (prop `locale` + threading + prop `SyncBanner.locale`). **Vigilance :** `packages/utils/src/dates.ts` et les call sites (layout, DashboardView, PortfolioView, HeroDetailDialog, SyncBanner).

### R-024b · App n'hydrate pas via `127.0.0.1:3001` (toggle mort)

**Corrigé :** 2026-06-06. **Cause :** CSP dev n'autorisait que `localhost` + Next 16 bloque les dev resources cross-origin. **Fix (dev-only) :** CSP `connect-src` += `ws://127.0.0.1:*`/`http://127.0.0.1:*` + `allowedDevOrigins:['127.0.0.1']`. **Conseil QA :** tester sur **`localhost:3001`**.

### R-033 · Attestation : « Capacité restante d'investissement » absente

**Statut :** déjà implémenté/vérifié. **Vigilance :** `packages/data/src/pdf/attestation.mapper.ts` (cap − investi année), `clubs.annual_investment_cap`.

### R-034 · Nom du club « Hacked name » sur l'attestation

**Statut :** stale data, résolu après re-sync. **Vigilance :** confirmer que `clubs.name` est lu (jamais hardcodé) ; un re-sync remet le bon nom.

### R-035 · Curseur non-pointer sur les éléments cliquables (Tailwind v4)

**Corrigé :** 2026-06-06.
**Symptôme :** le preflight Tailwind v4 ne pose plus `cursor: pointer` sur `<button>` → curseur flèche par défaut sur les cliquables (régression RGAA 3.3 / UX).
**Fix :** règle `@layer base` dans `packages/design-system/styles/index.css` (`cursor: pointer` sur les interactifs, `not-allowed` sur `[disabled]`/`[aria-disabled]`).
**Test :** `apps/web/playwright/cursor-pointer.spec.ts` (scanne les routes, échoue si un cliquable n'a pas `cursor: pointer`).
**Vigilance :** tout composant interactif custom (`div`/`span` avec `onClick` → ajouter `role="button"` + `tabIndex={0}` + `onKeyDown`) ; toute surcharge `cursor` en dur dans un composant.
