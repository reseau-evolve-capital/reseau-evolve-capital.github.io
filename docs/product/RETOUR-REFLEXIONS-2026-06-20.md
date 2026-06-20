# Retour de réflexion produit — 9 idées / manques → prochain lot

> **Date :** 2026-06-20 · **Branche :** `docs/reflexions-lot-net-b` (depuis `main` à jour)
> **Méthode :** concertation à 3 rôles (Designer UX · Lead dev · Expert usage IA) + audit du **code réel** par 4 sous-agents.
> **Statut :** triage validé avec l'owner (4 arbitrages tranchés le 2026-06-20). Prochaine étape : specs-as-prompt + maquettes Claude Design.

Légende coût : **S** = quelques heures · **M** = 1–2 j · **L** = 3 j+.
Lentilles : 👁️ Designer · 🛠️ Lead dev · 🤖 IA.

**Cadre :** « console réseau NET-B » = **Phase 2 du PRD réseau** (`PRD-NETWORK-ADMIN.md`, tickets NET-008→NET-015). Phase 1 « Lancer un club » = NET-A, **livrée**. Plusieurs idées ci-dessous s'y branchent.

---

## 1. Tableau de triage

| #   | Idée / manque                        | Verdict                          | Coût | Cible                      |
| --- | ------------------------------------ | -------------------------------- | ---- | -------------------------- |
| 7   | Retrait de Cloudflare (full GA4)     | 🟢 GO                            | S    | Lot — tech debt            |
| 8   | ClubSwitcher sur mobile              | 🟢 GO                            | S    | Lot — suivi NET-A #1       |
| 2   | Écran noir au lancement PWA          | 🟢 GO (skeleton)                 | S    | Lot                        |
| 5   | Désactiver un club (network_admin)   | 🟢 GO                            | M    | Lot — NET-B                |
| 1   | Attribution de rôles (réseau + club) | 🟢 GO (arbitré)                  | S→M  | Lot                        |
| 6   | Logging/audit de toutes les actions  | 🟢 GO (socle)                    | S→M  | Lot                        |
| 9   | Console feedbacks + insights IA      | 🟢 GO (réseau **+ bureau club**) | L    | Lot — NET-B (gros morceau) |
| 3   | Navigation offline                   | 🔴 Différé                       | M    | Hors lot                   |
| 4   | Widget iOS « quote-part »            | 🔴 Différé (piste stratégique)   | L+   | Hors lot                   |

---

## 2. Détail par item

### 7 — Retrait de Cloudflare 🟢 S

**État réel.** Cloudflare Web Analytics tourne **en parallèle** de GA4 (qui est le système actif : `G-GEV5MZ4QPV` app, `G-LP0PW78BQ5` vitrine, Consent Mode v2). Dead code :

- [`apps/web/components/Analytics.tsx`](apps/web/components/Analytics.tsx) (beacon CF) — à supprimer.
- Montage `<Analytics />` dans [`apps/web/app/layout.tsx:114`](apps/web/app/layout.tsx#L114) (+ import L4).
- CSP : `https://cloudflareinsights.com` ([`next.config.ts:80`](apps/web/next.config.ts#L80), connect-src) + `https://static.cloudflareinsights.com` (L90, script-src).
- Env : `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` (`.env.local`, `.env.prod`, `.env.example`).
- Docs : `docs/analytics.md` (obsolète), `docs/security/headers.md`, `docs/DEPLOY.md`.

🛠️ **Seul risque : la CSP.** Vérifier que `googletagmanager.com` est bien autorisé en `script-src`/`connect-src` après retrait (sinon on casse GA4 en voulant nettoyer CF). Grep final `cloudflareinsights` = 0 + check DevTools CSP violations en preview.
**Verdict :** GO, pas de design.

### 8 — ClubSwitcher mobile 🟢 S

**État réel.** `ClubSwitcher` n'est monté **que dans le footer de la Sidebar desktop** (`md:flex`). Sur mobile, un membre multi-club est **bloqué** sur son club par défaut. Données déjà câblées au layout (`allClubMemberships` + `activeClubId` → `AppChromeSidebar`). `AppTopbar` (packages/ui) a déjà le pattern de slots/callbacks (`onVotes`, `themeToggle`, `localeSwitcher`).
👁️ **Reco (confirmée followup NET-A) :** entrée **« Changer de club »** dans le menu avatar (visible si ≥ 2 clubs) → ouvre une **modale/sheet de sélection** (club actif surligné, nom + rôle). Parité desktop/mobile, pas de nouvel élément de chrome.
🛠️ Étendre l'API `AppTopbar` (props `clubs` + `activeClubId` + `onClubChange`) sans dépendance data ; au switch `setActiveClub` (cookie) + reload. e2e : étendre `club-switcher.spec.ts` au viewport mobile.
**Verdict :** GO. Petit spec UI (voir prompt design « gestion »).

### 2 — Écran noir au lancement PWA 🟢 S

**Cause réelle (audit).** Splash iOS crème **correct**, mais **aucun `loading.tsx` sur la route `(app)`** : après le splash, vide pendant le boot SSR (middleware auth bloquant `getUser()` + 2 RPC, `force-dynamic`, hydratation des providers). ~3–5 s observés.
👁️🛠️ **Quick win accepté par l'owner (« quitte à avoir un loader ») :** `loading.tsx` **skeleton brandé** sur `(app)` (et/ou dashboard) → le noir devient un chargement propre (~1 h, gain perçu majeur).
Optionnel V2 (M) : app-shell précaché par le SW + cache de session pour gratter ~1,5–2 s. Non prioritaire.
**Verdict :** GO (skeleton). App-shell = V2.

### 5 — Désactiver un club (network_admin) 🟢 M

**État réel.** `clubs` n'a **aucune** colonne `is_active`/`status`. `network_delete_club` existe mais **supprime** (hard, CASCADE). `get_user_club_ids()` ne vérifie pas le statut du club.
🛠️ **Pattern soft-delete :**

1. Migration : `clubs.is_active boolean NOT NULL DEFAULT true`.
2. Modifier `get_user_club_ids()` → `... AND clubs.is_active`. (Les RLS qui s'appuient dessus deviennent automatiquement conformes : un club désactivé sort de la matrice pour ses membres.)
3. RPC `network_disable_club(p_club_id, p_reason?)` + `network_enable_club` (gardées `is_network_admin()`, log dans `network_events`).
4. **Garde dans l'Edge `sync`** : refuser un club désactivé (sinon « sync zombie »).
5. `network_list_clubs` expose `is_active` ; garde RSC `/reseau/clubs/[id]` & accès direct URL.
   👁️ UI : section « Statut » sur la fiche club + bouton « Désactiver » (token **`data-negative`**, pas le rouge brand) → `SensitiveConfirmModal` (raison) ; badge « Désactivé » dans la liste ; bouton « Réactiver ».
   **Verdict :** GO, NET-B. Design léger (voir prompt « gestion »).

### 1 — Attribution de rôles 🟢 (arbitré)

Deux cas distincts :

- **Rôle réseau** (network_admin/board + titre) : 🛠️ les RPC `network_grant_role`/`network_revoke_role` **existent déjà** (garde `is_network_admin`, garde-fou « dernier admin »). Il **manque l'UI** — prévue en **NET-010** (`/reseau/membres` / Bureau). Coût **S–M**.
- **Rôle trésorier _dans un club_** : ⚠️ aujourd'hui **dérivé de la Google Sheet** (onglet `PARAMETRAGES`). C'est la cause de la confusion (« je ne vois pas comment donner le rôle ») : ça se fait dans la feuille, non découvrable dans l'app.
  **Arbitrage owner → éditeur in-app + anti-écrasement.** 🛠️ Migration : flag de protection (`memberships.role_overridden_at` ou colonne `role_source = 'sheet' | 'manual'`). RPC `admin_change_member_role(p_membership_id, p_new_role)` gardée `is_club_staff` (fail-closed, anti-escalade). Le **sync ne réécrit pas** un rôle marqué `manual` (et signale un éventuel écart). Coût **M**.
  👁️ UI : sélecteur de rôle + confirmation dans `MembersList` (`/admin`) ; gestion des rôles réseau dans `/reseau`.
  **Verdict :** GO. Voir prompt design « gestion ».

### 6 — Logging/audit de toutes les actions 🟢 (socle)

**État réel.** `network_events` (append-only, RLS lecture membre réseau) couvre **déjà** les 6 mutations réseau. Sentry **réactif** (erreurs only, no-op sans DSN). Rien pour cotisations/votes/rôles/admin.
🛠️ **Approche retenue : wrapper applicatif `withAudit()` autour des Server Actions, écriture asynchrone fire-and-forget** dans une table append-only `audit_log` (ou extension de `network_events`). Un échec de log **ne casse jamais** la mutation (réutilise le pattern `captureActionError`).
❌ **À proscrire : triggers Postgres génériques synchrones** — un trigger qui throw = rollback de la mutation = « app qui tombe » (exactement la contrainte de l'owner). Couverture 100 % mais risque inacceptable.
**Coût :** table + wrapper + câblage de ~10–15 actions critiques = **S→M**. Visualisation = écran réseau (peut suivre).
**Verdict :** GO (socle d'abord). Viewer = suivi.

### 9 — Console feedbacks + insights IA 🟢 L (pièce maîtresse)

**État réel.** Table `feedback` complète ([`036_feedback.sql`](supabase/migrations/036_feedback.sql)) ; l'Edge `feedback-dispatch` fait **déjà** par item : `ai_title`/`ai_severity`/`ai_summary`/`ai_category` (multi-provider `ai.ts` anthropic/openai/deepseek) + fan-out Discord/Notion/GitHub/Brevo + colonne `status` prête (`received`→`closed`). **Manques :** (a) **aucune UI de lecture** ; (b) **pas de `club_id`** (feedback global) ; (c) RLS = staff **global** seulement.

**Arbitrage owner → réseau + bureau de club (périmètre complet).** Le feedback a 2 audiences :

- 🤖 **Niveau réseau** (`network_board`/`admin`) : console transverse tous clubs + **digest IA agrégé** (« ce que disent les membres ce mois » : thèmes récurrents, sentiment, à traiter en priorité) + KPI (volume par type/catégorie/club, courbe sévérité). = **Zone 4 « Intelligence » du PRD (NET-017)** rendue concrète.
- 👁️ **Niveau bureau de club** (`/admin`) : la même console scopée à _leur_ club.

🛠️ **Fondations :** ajouter `feedback.club_id` (nullable, **dérivé de l'adhésion active de l'auteur** au moment du submit) + normaliser catégorie/statut ; RLS : staff-par-club voit son club, membre réseau voit tout. Le **digest agrégé** réutilise `ai.ts` (nouvelle fonction « résumé de N feedbacks » ou Edge planifiée).
**Coût :** L (3–4 j) — fondations S + console réseau M + console club M + digest IA S.
**Verdict :** GO. **Maquette dédiée** (prompt design « feedback console »).

---

## 3. Différés (avec coût, pour décision ultérieure)

### 3 — Navigation offline 🔴 Différé — coût M

Offline minimal (app-shell + dashboard caché + page offline) = **M**. Mais 🛠️ **ROI faible / risque réel** : portefeuille & cotisations sont `no-store` **par choix de sécurité**, et afficher une valorisation périmée hors-ligne est trompeur pour une app financière. La page `offline.html` existe déjà ; le **skeleton (#2)** règle la douleur perçue.
**Décision owner :** différer. (Si repris un jour : strict read-only dashboard + bandeau « hors-ligne, données du … ».)

### 4 — Widget iOS « quote-part » 🔴 Différé — coût L+ (stratégique)

🛠️ **Point dur :** un widget d'écran d'accueil iOS (WidgetKit) est **impossible depuis une PWA**. Il exige une **app native iOS** (Swift + compte App Store + review + maintenance) ou une extension widget App Store. Le brainstorm réseau l'estimait « M » → sous-estimé.
**Décision owner :** différer, **piste stratégique séparée** (« app native vs rester PWA »). À cadrer dans son propre brainstorming le moment venu. Alternative dégradée possible plus tard : « carte quote-part » partageable + tuile PWA soignée (sans vrai widget).

---

## 4. Backlog proposé pour le lot (à valider / renuméroter)

| Ticket suggéré | Famille | Titre                                                                      | Coût | Dépend de |
| -------------- | ------- | -------------------------------------------------------------------------- | ---- | --------- |
| **OPS-006**    | E-OPS   | Retrait complet Cloudflare (code + CSP + env + docs), check GA4 CSP        | S    | —         |
| **NAV-001**    | chrome  | ClubSwitcher mobile (entrée menu avatar + modale), API `AppTopbar`         | S    | —         |
| **PWA-002**    | pwa     | `loading.tsx` skeleton brandé sur `(app)` (anti-écran-noir)                | S    | —         |
| **NET-018**    | NET-B   | Désactiver/réactiver un club (migr `is_active`, RPC, garde sync, UI fiche) | M    | NET-007   |
| **NET-010**    | NET-B   | UI rôles réseau (`/reseau` Bureau) sur RPC `grant/revoke` existantes       | S–M  | NET-008   |
| **ADM-008**    | E-ADM   | Éditeur de rôle club in-app + anti-écrasement sync (`role_source`)         | M    | —         |
| **OPS-007**    | E-OPS   | Socle audit-log `withAudit()` (table append-only + câblage actions clés)   | S–M  | —         |
| **NET-019**    | NET-B   | Console feedbacks **réseau** + digest IA + KPI (ajout `feedback.club_id`)  | M    | 036       |
| **ADM-009**    | E-ADM   | Console feedbacks **bureau de club** (scopée club, RLS staff-par-club)     | M    | NET-019   |

**Différés (suivi) :** offline read-only (PWA-003, M), widget iOS natif (brainstorming stratégique dédié).

---

## 5. Maquettes Claude Design produites

1. `docs/product/PROMPT-DESIGN-feedback-console.md` — **Console feedbacks** (réseau + bureau club) + panneau insights IA.
2. `docs/product/PROMPT-DESIGN-gestion-roles-clubs.md` — **Surfaces de gestion** : désactiver un club, éditeur de rôles (réseau + club), ClubSwitcher mobile.

> Les écrans S sans nouvelle UI (retrait Cloudflare, skeleton, socle audit-log) n'ont pas besoin de maquette : ils réutilisent l'existant ou sont purement techniques.
