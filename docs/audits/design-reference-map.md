# Design Reference Map — Evolve Capital (app membre `apps/web`)

> **Artefact persistant.** Carte « écran d'export ↔ route de l'app » + notes de direction graphique.
> Source de vérité graphique : `REC/standalone-exports/*.html` (auto-suffisants, rendus hors-ligne).
> Source de vérité fonctionnelle : `REC/Phase2_Handoff/docs/screens/*`, `design.md`, tickets `BACKLOG_E-*`.
> Réutilisable par les futurs audits ET les sessions d'implémentation. **Mettre à jour, ne pas régénérer.**
>
> Dernière mise à jour : 2026-06-13 (Feedback Widget V0 : FeedbackSheet, AppTopbar, Server Action + Supabase). Captures de réf sous `docs/audits/shots/ref-*` et `docs/audits/shots/qa-feedback-*`.

## Fondations / tokens (réf : `ref-foundations-fullpage.jpeg`)

- **Typo** : `MADE Tommy Soft` (Black 900 / Bold 700) pour les héros & gros chiffres (`text.display`, `text.h1`) ; `Plus Jakarta Sans` pour le corps ; `IBM Plex Mono` pour les refs/labels techniques (uppercase, letter-spacing large, ex `TA QUOTE-PART`, `SYNCHRONISÉ IL Y A 14 MIN`, symboles boursiers).
- **Couleurs** :
  - `brand.yellow` (+ `brand.yellow.light`) = accent unique (logo, onglet actif, surlignage de mot, puce de notif, timeline cotisations « payé »).
  - `brand.red` (#E93E3A) = **branding uniquement, JAMAIS une perte**.
  - `data.positive` (vert) = gain / variation positive (TrendBadge, sparkline).
  - `data.negative` (#C53030, rouge sombre ≠ brand.red) = perte / impayé / retard.
  - `data.neutral` (gris), `data.warning` (orange).
  - Neutres 12 steps ; surfaces : fond application (≈ N-50/blanc cassé), carte (`surface.card`), carte élevée, overlay.
- **Radius** : `sm` 6px · `md` 10px · `lg` 14px. **Ombres** : `card` · `popover` · `modal` (douces, diffuses). **Motion** : `ease.fast` 120ms · `std` 200ms · `slow` 320ms · `decelerate` ; sparkline draw-on 500ms ; apparition fade+translateY. `prefers-reduced-motion` à respecter.
- **Grille** : Base 4. Container desktop 1280 (max), 12 colonnes ; mobile 4 col. Breakpoint membre prioritaire = **375×812**.
- **Light + Dark (RÉFLEXE D'AUDIT)** : la plupart des exports exposent un **toggle LIGHT/DARK** (en haut de page, et parfois un sélecteur CLAIR/SOMBRE _intégré à chaque écran_ — ex. login desktop ; les deux pilotent le même état). **Avant de conclure une comparaison rendu↔réf, basculer light ET dark** (`browser_click` sur le bouton DARK) : un écran capturé par défaut peut être dans l'autre thème → faux positif. Capturer les deux quand l'écran supporte les deux thèmes. Le **dashboard desktop de réf** est capturé en DARK ; mobile en LIGHT. Si l'app livrée est Light-only, ne pas flaguer l'absence de dark mode comme bug (à confirmer) — mais le **toggle clair/sombre fait partie de l'intention** des écrans de connexion desktop.

---

## Écrans authentifiés (espace membre)

### `/dashboard` — Tableau de bord membre (P0)

- **Réf** : `ref-mobile-dashboard.jpeg`, `ref-desktop-dashboard.jpeg` (`Dashboard - Standalone.html`).
- **Structure mobile** (ordre vertical) : header logo + avatar → ligne mono `● SYNCHRONISÉ IL Y A 14 MIN` → label `TA QUOTE-PART` → **hero chiffre** (`65 574,87 €`, Tommy Soft Black, € en gris) → TrendBadge vert `↑ +1,2 % · +773 €` + `hier · 17.04` → **sparkline 30j** vert dégradé (axes `19 MARS / 30 J / 18 AVR`) → card **Statut cotisation** (badge `✓ Régulière`, prochaine échéance) → card **Portefeuille du club** (TrendBadge, gros chiffre `1,23 M€`, club + `voir le détail →`) → **BottomNav**.
- **Desktop** : sidebar gauche (logo, nav `Tableau de bord`/`Portefeuille du club`/`Mes cotisations`/`Réseau des clubs`/`Profil`, onglet actif = pastille jaune, carte « CLUB ACTIF » en bas) ; topbar `SYNCHRONISÉ…` + date + avatar ; colonne centrale hero + bloc `ÉVOLUTION · 30 JOURS` avec **toggle 7J/30J/90J/1A/MAX** + grand graphe ; colonne droite empilée : Statut cotisation, Portefeuille du club (mini-barres mensuelles), Annonces du club (`V1`).
- **Direction graphique** : hero énorme prioritaire (« quote-part en 3 secondes »), data.positive sur variations, aucun rouge brand. AAA ≥ 7:1 sur le hero ; `aria-live` sur la valeur ; h1 = « Ta quote-part ».
- **Décisions V0 actées (mémoire — NE PAS flaguer)** : variation/sparkline volontairement non alimentées en V0 ; book value ; **BottomNav 3 onglets** (la réf en montre 5 → écart attendu, pas un bug).

### `/dashboard` — Dashboard **V2** (variante A/B, 2026-06-12)

- **Réf** : `Dashboard V2 - 4 Frames (standalone).html` (5 planches : 01 Mobile Light, 02 Mobile Dark, 01B états toggle 30J/MAX, 03 Desktop Light, 04 Desktop Dark). Contexte design : `docs/tickets/PROMPT-DESIGN-DASHBOARD-V2-GRAPH.md`.
- **Mécanique A/B** : `getDashboardVariant()` server-only (`apps/web/lib/experiments/dashboard-v2.ts`), seul point de branchement = `page.tsx`. Précédence `DASHBOARD_V2_FORCE` (env) > cookie `ec_dashboard_variant` (lecture seule, QA/e2e — **jamais écrit par l'app** : `cookies().set()` interdit en RSC Next 16 et middleware gelé ; le hash FNV-1a par `userId` est plus sticky qu'un cookie) > hash vs `DASHBOARD_V2_ROLLOUT` (défaut **100** = V2 pour tous, rollout 100 % acté par l'owner le 2026-06-12 ; `0` = kill-switch retour V1 général, valeur intermédiaire = A/B — précédence env > cookie > hash inchangée). **Pas de SDK `flags`** (arbitrage : pas d'Edge Config configuré, `FLAGS_SECRET` = friction e2e, un `decide()` custom aurait été nécessaire de toute façon) — signature « decide-like » pour migration future.
- **Structure V2** : hero **OPEN** (hors card, 58px mobile / 88px desktop, TrendBadge + méta « hier · JJ.MM ») → carte **Évolution** (`DashboardEvolutionChart`, toggle `[30J|MAX]` mobile / `[7J][30J][90J][1A][MAX]` desktop, area chart `--data-positive` dégradé 0.26, labels dates flex — pas de vrais axes Recharts) → statut cotisation **compact** → **metrics ribbon** 1×3. Desktop : 2 colonnes 58/42, droite = statut + « Ma position » + teaser Portefeuille du club.
- **Données : LIVE d'abord, DEMO en fallback (DSH-012, 2026-06-12)** : le RSC appelle `getDashboardChartData` (DSH-011, `club_reporting_daily`) **uniquement pour la variante v2** ; série live → slice par période + downsample ≤ 400 pts côté client (`dashboard-chart-view.ts`, helpers purs testés), TrendBadge hero = `variations.d1` (null → pas de badge), `chart_data_source: 'live'`. Table vide / erreur → fallback `dashboard-chart-demo.ts` (séries déterministes, dernier point = quote-part réelle) avec micro-label **« Courbe illustrative »** + `chart_data_source: 'demo'`. ⚠ `deltaPct` live = fraction (formatPct direct) vs demo = unités % (÷100) — documenté dans les deux modules. Approximation V0 héritée de DSH-011 : quote-part historique = `portfolio_value × détention actuelle`, coupée à `joined_at`. **V1 strictement inchangée** (aucun graphe, ne paie jamais la requête chart — diff limité au hook analytics `dashboard_viewed`).
- **Déviations assumées vs réf** : (1) compact `pending` → badge **warning** (V1 garde neutral) ; (2) glyphe TrendBadge `▲` conservé (réf `↑`) ; (3) pill toggle 28px visuel + **hit-area verticale 44px** (`before:h-11`) — largeur ≈ bouton, activation au-dessus du pill prouvée e2e ; (4) **teaser club = valeur DEMO** `708 408 €` (la valo réelle exige `useClubSummary`, staff-only 403 membre — follow-up data), nom de club réel ; (5) entre `md` (768) et `lg` (1024) le chart compact montre 5 périodes (`mobileHidden` est `md:`-based, assumé) ; (6) 5 boutons période dans le DOM, 3 masqués par CSS responsive (pas de `useMediaQuery` → pas de mismatch SSR) ; (7) `SparklineMini` défaut couleur → `var(--color-data-positive)` (zéro usage prod alimenté, prouvé par grep) ; (8) hauteur Recharts numérique fixe (supprime le warning 0×0 à l'hydratation).
- **QA 2026-06-12** : scorecard **100 %** (CONVERGÉ, itération 2/3) — 8 comparaisons light+dark, critère bloquant graphe demo OK, V1/chrome/EN/smoke sans régression. E2E : `dashboard-v2.spec.ts` 9/9 (forçage par cookie), `dashboard.spec.ts` 7/7, `cursor-pointer` 13/13. `playwright.config.ts` : `E2E_BASE_URL` opt-in (no-op sans la var) + dérivation consent-state — :3001 squatté par Docker en local.
- **Bug PRÉ-EXISTANT découvert (hors sprint, à ticketer)** : contraste BottomNav light onglet actif `text-brand-yellow` sur card blanche = ratio 1,57 < 4,5 (`packages/ui/src/organisms/BottomNav/BottomNav.tsx:60`, Sprint 4) — invisible jusqu'ici car `a11y.spec.ts` ne scanne `/dashboard` qu'en desktop ; exclusion axe documentée dans `dashboard-v2.spec.ts`, à retirer après correction.

### `/portfolio` — Portefeuille du club

- **Réf** : `ref-mobile-portfolio.jpeg`, `ref-desktop-portfolio.jpeg` (Screens / Screens-Desktop, écran D/A).
- **Desktop** : 3 colonnes — sidebar nav | colonne filtres (`SECTEUR` : Tous/Tech/Santé/Autres avec compteurs ; `DEVISE` : EUR/USD/DKK cases cochées + compteurs ; carte `DERNIÈRE SYNC`) | centre : titre `Portefeuille` + sous-titre club·positions, **hero valeur** `1 234 568 €` + TrendBadge `↑ +0,8 % · +9 820 € AUJOURD'HUI`, **table 8 colonnes triables** (Titre · Symbole · Parts · PRU · Cours · Valeur · Gain/Loss · Alloc., flèches de tri `↕`), badges secteur (TECH/SANTÉ/AUTRES) ; footer `Affiche 8 sur 15 — voir toutes` + `HISTORIQUE DES TRANSACTIONS →` | colonne droite : `RÉPARTITION SECTORIELLE` **donut 3 secteurs** (centre « 15 positions / 3 secteurs »), légende Tech 72 % / Santé 15 % / Autres 13 %, carte `GAIN / PERTE TOTAL` (vert).
- **Mobile** : hero 40px (< 54 du dashboard), donut 3 secteurs, liste de positions (cartes), **LVMH en perte rendu en `data.negative`** (cas test du rouge dataviz). BottomNav.
- **Direction graphique** : densité tabulaire maîtrisée, mono pour symboles/chiffres, tri visible. Perte = data.negative jamais brand.red.
- **Décisions V0 actées** : donut/filtre **par SECTEUR** ; valo live + fallback snapshot ; `pct÷100`.

### `/contributions` — Mes cotisations

- **Réf** : `ref-mobile-contributions.jpeg`, `ref-desktop-contributions.jpeg` (écran E/B).
- **Desktop** : 2 colonnes — gauche stats : carte `✓ SITUATION RÉGULIÈRE` (« Tu es à jour », prochaine échéance), KPI `TOTAL COTISÉ` 28 000 €, `NOMBRE DE MOIS` 103, `QUOTE-PART` 8,99 %, encart « Aucune pénalité en cours », CTA `TÉLÉCHARGER L'ATTESTATION DE DÉTENTION` (badge `V1`) ; droite : `HISTORIQUE MENSUEL · 9 ANNÉES`, **timeline années × 12 mois** (labels JAN…DÉC), légende `Payé / En cours / Retard / Exempté / À venir`, cases **jaune Evolve** pour payé (pas vert), case noire = mois courant en cours, case orange `!` = retard, grisé = exempté/à venir, note `Règle en vigueur depuis janvier 2023`.
- **Mobile** : « Mes cotisations », situation régulière + 3 KPI + timeline annuelle en jaune Evolve.
- **Direction graphique** : timeline = jaune Evolve (PAS vert GitHub) — explicite dans la note de réf. CTA attestation `V1`.
- **Décisions V0 actées (mémoire)** : suit **l'écran 04** (≠ backlog) ; PDF attestation → V1 ; email → E-NTF ; organism `ContributionsTimeline` réutilise `CotisationMonth`. Dette connue : tap-target 24px < 44px.

---

## Parcours d'entrée & onboarding

### `/login` — Magic link

- **Réf** : `ref-mobile-login.jpeg` (écran A, mobile) + **`ref-desktop-login.jpeg`** (+ `ref-desktop-login-dark.jpeg`) — desktop ajouté via `Login & Onboarding - Desktop-standalone.html` (2026-06-03).
- **Structure mobile** : logo centré → `ESPACE MEMBRE` → hero « Bienvenue dans ton espace **Evolve**. » (mot surligné jaune) → microtexte rassurant → `EMAIL` + champ → CTA sombre `RECEVOIR MON LIEN →` → microtexte `Lien valable 15 min. Aucun mot de passe, aucun spam.` → `OU` → bouton outline `SE CONNECTER AVEC UNE PASSKEY` (`V1`) → `Besoin d'aide ?`.
- **Structure desktop (split 2 panneaux)** : panneau gauche **sombre (toujours)** = marque (`RÉSEAU DE CLUBS D'INVESTISSEMENT`, hero « Rends visible ce que ton club construit ensemble. » mot surligné jaune, viz réseau de clubs, stats bas `4 CLUBS · 48 MEMBRES · 1,2 M€`) ; panneau droit **thémé** = `ESPACE MEMBRE · CONNEXION` + hero « Bienvenue. » + form (EMAIL, `RECEVOIR MON LIEN →`, microtexte 15 min, `OU`, passkey `V1`, « Première venue ? … en savoir plus ») + **toggle CLAIR/SOMBRE intégré** en haut-droite + lien `Besoin d'aide ?`.
- **Note** : passkey `V1` → absence attendue. Toggle clair/sombre = intention de l'écran desktop.

### `/login/check-email` — Lien envoyé

- **Réf** : `ref-mobile-check-email.jpeg` (écran B, mobile) + **`ref-desktop-check-email.jpeg`** (desktop, même split + toggle).
- **Structure** : `CONNEXION SANS MOT DE PASSE`, check animé, email masqué `l***@…`, actions `Renvoyer (45 s)` / `Changer`, encart « rien reçu ? ».

### `/login/verify` — Vérification du token (transitoire)

- **Pas d'export** (écran technique de redirection). Réf = `design.md` / bonnes pratiques : état loading explicite, message d'erreur humain si token invalide/expiré, pas de page blanche.

### `/onboarding/step-1` — Profil

- **Réf** : `ref-mobile-onboarding-step1.jpeg`, `ref-desktop-onboarding-step1.jpeg`.
- **Structure** : step indicator Evolve (`ÉTAPE 01 / 03` mobile ; rail gauche 3 étapes + promesse « 3 minutes » desktop), avatar upload, 3 champs (prénom/nom requis, téléphone facultatif, grille 2 col), CTA actif `CONTINUER →`. Desktop : form centré max-w 640, rail droit pour citation.

### `/onboarding/step-2` — Consentement

- **Réf** : `ref-mobile-onboarding-step2.jpeg`, `ref-desktop-onboarding-step2.jpeg`.
- **Structure** : `ÉTAPE 02 / 03`, 3 cases à cocher (2 requises + 1 optionnelle annuaire), liens « lire » discrets alignés à droite, **CTA en état disabled explicite** tant que les requises ne sont pas cochées (card 640, colonne 480).

### `/onboarding/step-3` & `/onboarding/tour` — Tour guidé

- **Réf** : `ref-mobile-onboarding-step3.jpeg`, `ref-desktop-onboarding-step3.jpeg`, **`ref-desktop-onboarding-step3-tour.jpeg`** (écran C3 « Step 3 · Tour guidé » du nouveau fichier desktop).
- **Structure** : `ÉTAPE 03 / 03`, **carrousel 3 slides** (visuels géométriques Brand Yellow + N-900), 3 dots, CTA `Accéder à mon espace`, sous-lien `Passer le tour`. Desktop : slide active 640px, slides latérales en peek 50 %, CTA 280px.
- **Mapping réel constaté (Phase 2)** : dans l'app, `/onboarding/step-3` = écran de **consentements** (checkboxes RGPD/annuaire) avec `ÉTAPE 3/3`, puis redirige vers `/onboarding/tour` = **carrousel** (sans indicateur d'étape). La réf desktop, elle, montre l'étape 3 = **le carrousel** étiqueté « ÉTAPE 3 / 3 ». → cohérence du fil d'étape à corriger sur `/tour` (cf. AUDIT F9). NB la réf desktop sépare aussi Step 2 = « Consentements » (≠ découpage de l'app).

> **Onboarding desktop** : `ref-desktop-onboarding-step1/2/3*.jpeg` proviennent désormais aussi de `Login & Onboarding - Desktop-standalone.html` (login + check-email + step 1/2/3 desktop, avec toggle CLAIR/SOMBRE).

---

## Espace trésorier / admin (SANS équivalent dans les exports)

### `/admin`, `/admin/members`, `/admin/cotisations`

- **Aucun artboard** dans `standalone-exports`. Audit basé sur : `design.md`, tokens/fondations communes, et critères d'acceptation `BACKLOG_E-ADM`. Attendu : **cohérence inter-écrans** (mêmes tokens, sidebar, mono labels, cartes, tables, EmptyState/ErrorState) avec les écrans membres.
- **Décisions V0 actées (mémoire S7)** : 1er chemin multi-membres (listes + RLS treasurer) ; impayé = `late`/`pending` ∨ `amount_due>0` ; garde RSC par-club + middleware any-club ; CSV → V1 ; ADM-004 réutilise `SyncBanner` ; seul organism = `MembersList`. Dette : `Switch` 0×0 dans apps/web (design-system `@import` commenté).

### ADM-007 — Accès & invitations (réf : `Admin - Accès & Invitations-standalone.html`)

- **Réfs** : `ref-adm007-standalone-{light,dark}.jpeg` (4 écrans, toggle LIGHT/DARK). Source de vérité visuelle des écrans ADM-007.
- **`/admin/invitations`** : barre d'onglets admin (`AdminTabs` : Tableau de bord · Membres · Cotisations · Invitations) + titre/sous-titre + `InviteForm` inline (email + « Envoyer l'invitation » + note 72 h) + `InvitationsTable` (Email · Date d'envoi · Expire le · Statut · Actions). Badges statut (`InvitationStatusBadge`) : En attente (ambre) / Acceptée (vert) / Expirée (gris) / Révoquée (rouge, email barré). Actions Renvoyer/Révoquer désactivées selon statut. **Lien copiable** affiché après création/renvoi (V0 sans envoi auto → E-NTF).
- **`/admin/members`** : colonne **Accès** après Statut (`AccessBadge` : Actif vert / Bloqué rouge+cadenas) + menu `···` (`MemberActionsMenu` : Bloquer/Débloquer + Voir la fiche → `/admin/cotisations?membre=`). Modale `LockMemberModal` (raison optionnelle, action réversible). **Voir la fiche dédiée + historique d'accès = V1.**
- **`/acces-suspendu`** (public, hors chrome) : `SuspendedScreen` **toujours sombre** (rupture volontaire — `data-theme="dark"` forcé au niveau `<html>` par la route, car un `data-theme` imbriqué ne suffit pas : `--color-bg` est résolu à `:root`). Cadenas ouvert + halo jaune, CTA `mailto:` trésorier, lien « Me déconnecter » (Server Action). Desktop + 375 responsive.
- **Déviations assumées vs standalone** : (1) colonne Accès `/admin/members` n'émet QUE Actif/Bloqué — **pas de badge « Invité »** (décision §5.3 : les invités vivent dans `/admin/invitations`, le membership n'existe qu'à l'acceptation) ; `AccessBadge` supporte quand même `invited` pour fidélité. (2) L'app réutilise la sidebar membre + lien « Espace trésorier » → la nav admin du standalone (sidebar dédiée) est rendue en **barre d'onglets** en tête de contenu. (3) Lien d'invitation **copiable** (pas d'email auto V0). (4) Membre invité ⇒ accès app (allowlist) mais **pas de membership** tant qu'un staff ne l'ajoute pas (dashboard « Données non disponibles ») — provisioning membre = **follow-up**.
- **Contraste AA** : l'ambre vif `--data-warning` (#D97706) sur tint clair échouait WCAG AA (2.92:1) → token `--data-warning-strong` (#92400E clair / #FCD34D sombre) pour le TEXTE (Badge warning, Pill cotisation-late, AccessBadge invited). Détecté par axe E2E (jsdom ne mesure pas le contraste).
- **Gotcha schéma** : `memberships` a 2 FK vers `users` (`user_id` + `locked_by`) → embeds PostgREST `users` désambiguïsés (`users!memberships_user_id_fkey`). Toute FK vers `users(id)` est `ON UPDATE CASCADE` (re-key au login).

---

## Routes sans équivalent graphique (audit sur bonnes pratiques)

| Route                         | Réf                                      | Approche d'audit                                           |
| ----------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `/` (root)                    | Placeholder « WIP »                      | Hors-périmètre design ; noter seulement si exposé en prod. |
| `/login/verify`               | —                                        | États loading/erreur, pas de page blanche.                 |
| `/admin*`                     | —                                        | `design.md` + cohérence inter-écrans + tickets ADM.        |
| `404` (route morte ex `/zzz`) | Aucun 404 custom trouvé dans les exports | `design.md` + bonne pratique : `not-found.tsx` custom.     |
| error/global-error states     | —                                        | Fallback humain, pas de stack.                             |

## Constats structurels relevés dès la recon (à confirmer en Phase 2)

- `apps/web/app/not-found.tsx` **absent** → 404 = page Next par défaut (candidat **bug objectif**).
- `apps/web/app/global-error.tsx` **absent** ; pas d'`error.tsx` racine ni sur `(auth)` (les segments `(app)/*` en ont chacun un).
- Warning Next 16 : `middleware` déprécié → renommer en `proxy` (déjà noté en dette Sprint 3).

---

## Notifications, emails & attestation (E-NTF — Sprint 8)

> Source de vérité visuelle : 3 nouveaux exports (toggle LIGHT/DARK) servis sur `:8770`.
> Emails et PDF ne se rendent pas comme une page d'app : QA = HTML rendu (React Email) / PDF→image confrontés à l'export.

### Système de feedback in-app (réf : `Feedback System (standalone).html`)

- **Artefacts code** : `packages/ui/src/molecules/Toast/*` (`Toast`, `ToastProvider`/`useToast`), `packages/ui/src/organisms/Banner/*`, `SyncBanner` refactoré sur `Banner`. Monté dans `apps/web/app/(app)/layout.tsx` (région `aria-live` globale).
- **Toasts** (NTF-006) : 4 variantes (success/info/warning/error), auto-dismiss par variante (`error` persistant), barre de compte à rebours (`motion-reduce:hidden`), action UPPERCASE colorée, icône chipée 32×32, pile **bas-centre mobile / bas-droite desktop**, `aria-live` polite (assertive sur error), Escape, cibles 44×44, focus glow. `info` = accent **brand.yellow** (pas data-neutral).
- **Bannières** : `Banner` générique (info/success/warning/error/sync), dismissible optionnel, slot actions (`inline`/`stacked`). Centre de notifs persistant + cloche = **V1 (NTF-007)**.
- **Règle couleur** : succès=data-positive, erreur=data-negative, warning=data-warning(+texte data-warning-strong), info=brand.yellow ; **jamais brand.red** pour un état.

### Emails transactionnels (réf : `Emails Transactionnels (standalone).html`)

- **Artefacts code** : `packages/data/src/emails/` — `_layout/EvolveEmailShell` (shell commun : bandeau accent, logo, conteneur 600px, footer RGPD) + `MagicLinkEmail` (NTF-001), `WelcomeEmail` (NTF-002), `SyncErrorEmail` (NTF-003), `AttestationEmail` (NTF-005). Rendu via `renderEmailHtml`. Couleurs depuis le **pont tokens TS** `@evolve/design-system` (miroir de `tokens.css`, contextes non-Tailwind).
- **Émetteurs** : magic link via SMTP custom Supabase (Brevo en prod, Mailpit/Inbucket en local) ; welcome/sync-error/attestation via Edge Functions → **API Brevo `/v3/smtp/email`** (rendu React Email en import `npm:`/dynamique côté Deno). `BREVO_*` server-only.
- **Direction graphique** : emails **clair par défaut** (mode sombre laissé aux clients mail, aucune image de fond) ; CTA jaune brand (encre #231F20, 10.36:1 AAA) ; footer RGPD réutilisable ; warning sync = data-warning, jamais brand.red.

### Attestation de détention — PDF (réf : `Attestation de Detention (standalone).html`)

- **Artefacts code** : `packages/data/src/pdf/` — `AttestationDetention.tsx` (`@react-pdf/renderer`, A4 portrait) + `attestation.mapper.ts` (mapper pur, fallback `—`) + `renderAttestationPdf`. Route Node `apps/web/app/api/attestation/detention/route.ts` (session + RLS). CTA actif sur `/contributions` (`ContributionsView`, blob+download, toast succès/erreur).
- **Structure** : en-tête (logo, « Attestation de détention », DOCUMENT OFFICIEL, réf, date) ; identité ; **4 chiffres clés** (parts % · cotisation € · quote-part € · valorisation €) ; **3 compléments** (invest. année · capacité restante · effort mois) ; pied « généré automatiquement … ne nécessite pas de signature » + n° de réf + **QR** ; bandeau Evolve. Tokens via le pont TS, format via `@evolve/utils`, jamais brand.red sur un chiffre.
- **Envoi auto mensuel** (NTF-005) : `pg_cron` (5 du mois) → Edge `send-monthly-attestations` (PDF en pièce jointe base64, idempotent par période via `attestation_sends`).

### Journal des arbitrages / divergences assumées (E-NTF)

- **Vérif backend = Mailpit + envoi capté** (décision owner) ; magic link auto via Supabase Auth, emails Edge vérifiés par rendu HTML + Vitest (pas de creds Brevo en local).
- **CTA attestation câblé ACTIF** (décision owner), pas en flag désactivé.
- **NTF-006 info = brand.yellow** (corrigé : la 1re passe sortait du gris data-neutral) — conforme à l'export ; icône chipée + barre de compte à rebours + action UPPERCASE ajoutées en passe de correction QA ; bug `cursor:default` (preflight Tailwind v4) corrigé sur tous les cliquables.
- **NTF-005 `period`** : le composant convertit le format canonique `YYYY-MM` (cron) en libellé FR « avril 2026 ».
- **Lacunes data attestation** : colonnes ajoutées (migration 022) et **câblées au mapper** — `clubs.broker_account_ref`, `clubs.annual_investment_cap` (→ capacité restante = plafond − investi), `users.postal_address`. Elles restent vides tant que non renseignées (rendu `—`) → **follow-up = peuplement des données**, plus de lacune schéma. Reste en V1 : bloc dirigeants (enum rôles à confirmer).
- **Vérification du QR — FAIT** : le QR pointe `/verifier/{ref}` → **page publique livrée** (migration 023 : `attestation_sends.reference` + RPC `verify_attestation` à divulgation minimale). Seule l'attestation **mensuelle** (cron) est enregistrée donc vérifiable ; l'on-demand produit la même réf déterministe mais n'est pas enregistré. Collision hash 4 car. assumée (identifiant lisible non-secret).
- **Limites de rendu assumées** : emails sans dark (intention V0) ; PDF Helvetica ne rend pas U+202F → espaces fines remappées en espace normale pour le PDF (formatEUR reste canonique ailleurs) ; bandeau email dégradé avec fallback solide pour Outlook.
- **Dette a11y connue conservée** : tap-target CTA contributions 40px < 44px (dette S6, hors périmètre E-NTF) ; chip glyphe toast 20px dans chip 32px (atome `Icon` limité à 16/20/24) ; pas de token `brand-yellow-50` → surface info via opacité `/16` (suivi design-system).

---

## Sprint E-QA1 — corrections post-test utilisateur (2026-06-06)

23 commits sur `feat/monorepo` (non poussés). Gate complet vert (lint+typecheck+vitest 13 tasks), Deno sync **29/0** + send-email **7/7**, QA runtime réelle (login PKCE Mailpit, light/dark/mobile). Tous les items backlog **CONVERGÉS** (preuves DB + screenshots `docs/audits/shots/qa-*.jpeg`).

### Arbitrages owner (tranchés en Phase 0)

- **A9 illustrations login** = **Dataviz de marque abstraite** (courbes/donut/sparklines tokens brand, micro-anim, reduced-motion) — composant `apps/web/components/auth/BrandDataviz.tsx` (remplace l'ancien `ClubNetworkViz`).
- **B5 invitations** = **restreindre aux membres du club** (migration 031) : `admin_create_invitation` lève une exception si l'email n'est pas déjà membre (plus d'allowlist arbitraire) ; révocation couvre aussi `accepted` (verrouille l'accès) ; état UI « lien à copier » vs « envoyé ».
- **Email magic link** = **Auth Hook Edge Function (Brevo)** pour la prod (localisé fr/en via `user_metadata.locale`, lien-only) + **template statique brandé lien-only** pour le LOCAL (`supabase/templates/magic_link.html`, vérifié Mailpit sans code OTP). Le hook reste **commenté en local** (Brevo enverrait de vrais emails) → activation prod = action owner.

### Décisions lead loggées

- **B1 rôles** : dérivés de PARAMETRAGES (Président/Trésorier) par matching nom normalisé ; **Base ne pose plus le rôle** (insert→défaut DB 'member', update→préservé) ; réconciliation **fail-safe** (ne wipe RIEN si 0 dirigeant résolu) ; **network_admin jamais rétrogradé** (y compris s'il est membre Base). Rôle « Secrétaire » **déféré** (pas de valeur d'enum orpheline en V0).
- **B2/C2 réconciliation** : positions ET agrégats portefeuille désactivés (`is_active=false`) si absents du dernier import (historique conservé, pas de delete).
- **C1 total portefeuille** = ligne d'agrégat **« Portefeuille »** (col G, matchée par LABEL, persistée en table `portfolio_aggregates` migration 029), **fallback** somme live si absente. Valeurs live conservées par position. (Tension assumée avec le principe « valo live » : le TOTAL suit la matrice, conforme à la consigne owner.)
- **E1 dashboard vide 1re connexion** : `member_quote_part` **MV → VUE normale `security_invoker`** (migration 030) → toujours à jour (suit la cascade re-key login), RLS native (un membre ne voit QUE ses chiffres — plus sûr que la MV). `refresh_member_quote_part` → no-op, appel retiré du sync.
- **E2 « synchronisé il y a… »** unifié sur `clubs.synced_at` (desktop+mobile), plus la colonne MV par-membre.
- **F4 « Ancien membre »** = badge **présentationnel** dérivé de `status='left'` (PAS de valeur d'enum `member_role` — éviterait de casser RLS/STAFF_ROLES). Opacité de ligne déjà existante ; **opacité retirée du badge Accès** (faisait chuter le vert #0A7A4D à 2.46:1 → échec AA ; la ligne grisée porte l'atténuation).
- **A3 magic link** : cause racine réelle = **flux PKCE** (`code`→`exchangeCodeForSession`), pas `token_hash` ni double-mount. Échange déplacé dans une **route handler serveur** `(auth)/login/verify/route.ts` (idempotent, gère PKCE + OTP invitation). A1 guard onboarding dans `middleware.ts`. A2 = vraie page `(app)/profil/`.

### Dette / suivis (non bloquants)

- **i18n temps relatif** : `formatRelativeTime` désormais localisé (prop `locale` + threading) ; les formatters **monnaie/date restent fr-FR** (décision i18n antérieure).
- **CSP** : `*.sentry.io` autorisé (DSN régionaux `*.ingest.de.sentry.io`). **Cloudflare RUM** : mismatch CORS local (`ACAO http://localhost` ≠ `:3001`) lié à `NEXT_PUBLIC_SITE_URL` sans port — bruit LOCAL, à vérifier en prod.
- **D2 compteur mois** : vue membre = mois `paid` réels (≠ #ERROR! source) ; vue admin = « Versements ». Sémantique légèrement divergente entre vues → harmonisation copy à confirmer (mineur).
- **Dette e2e harness (PRÉ-EXISTANTE, pas une régression du sprint)** : (1) `a11y.spec /portfolio` rouge car le **seed e2e a 0 position** → `getPortfolioData` renvoie null → EmptyState (le `return null` sur 0 ligne pré-date le sprint) ; fix = mocker l'API portfolio dans a11y.spec ou seeder des positions. (2) `auth.spec:37` rouge **en suite** mais **vert en isolation** = contamination cross-spec (toggle de rôle seed). Specs touchées ré-alignées : `access.spec` (modèle B5), `admin.spec` (wording F1). Suite sur **seed propre = 43/45** (2 dettes ci-dessus).
- **Migrations 029/030/031 local-only** (projet non lié) — à pousser remote au déploiement.
- **Actions owner** : (1) activer le hook `[auth.hook.send_email]` + secrets Brevo/SEND_EMAIL_HOOK_SECRET en prod (localisation emails) ; (2) DSN Sentry régional ; (3) fournir un asset logo SVG/PNG transparent (note antérieure).

---

## PWA-001 — Système d'installation PWA (worktree `feat/pwa-001-install-banner`, base `main`, 2026-06-07)

Réf visuelle : `REC/standalone-exports/PWA Install Banners (standalone).html` (:8770, light+dark). Spec validée : `docs/superpowers/specs/2026-06-07-pwa-install-banner-design.md` ; plan : `docs/superpowers/plans/2026-06-07-pwa-install-banner.md`.

### Arbitrages vs ticket (validés avec l'owner)

- **Persistance = localStorage (par-appareil)**, PAS Supabase : l'install PWA est par nature liée à un appareil → plus correct + supprime migration/RLS/route/mode d'échec réseau. (Ticket prévoyait `member_pwa_dismiss` + RLS → abandonné.)
- **Hors-ligne complet** mais **isolé + garde-fous** : SW versionné ; navigations network-first→cache→`offline.html` ; assets cache-first ; données GET en stale-while-revalidate **qui respecte `Cache-Control: no-store`** (portfolio/cotisations/attestation = `no-store` → jamais cachés ; dashboard cachable, fraîcheur via l'indicateur « synchronisé il y a X » existant) ; cache de données **purgé à toute fin de session** (`PwaCacheCleaner` dans le layout `(auth)` + clear immédiat au logout topbar).
- **Trigger robuste simplifié** : visite≥2 + cooldown (7j/30j/permanent ; Android refusé=3j) + non-standalone + onglet visible & focus 8 s + pas pendant saisie. (Pas de reset-sur-chaque-interaction du ticket → machine d'état plus simple/testable.)
- **1 composant paramétré** `PwaInstallSheet` (au lieu de 3 variants) + `IosInstallInstructions` (modale Radix 2 étapes, illustrations iPhone/iPad) → `packages/ui` (Storybook + play + axe).
- **Analytics** : 6 events câblés via le wrapper `trackEvent` existant (no-op aujourd'hui — Cloudflare Web Analytics n'a pas d'API events ; prêts pour un sink V1). Critère #10 « vérifier dans Umami » non atteignable.

### Vérification runtime (build prod isolé, port dédié 3019)

- Manifest `/manifest.webmanifest` servi (`application/manifest+json`, icônes 192/512/maskable + apple-touch-icon 180), `theme-color`, `apple-mobile-web-app-*` OK.
- **App installable** : Chrome a tiré `beforeinstallprompt` (manifest + SW + icônes OK) et la capture app a fait `preventDefault()` (prompt différé stocké).
- **SW enregistré + controlling** ; ne casse pas la navigation ; clear du cache de données prouvé (`postMessage('clear-data-cache')` → entrée purgée).
- 0 erreur console issue du code PWA (les 2 erreurs = CF RUM CORS local pré-existant ; 1 warning = police MADE Tommy Soft gitignorée, pré-existant).

### Dette / suivis PWA

- **E2E auth-dépendant non exécuté dans cette session** (env contendu : un autre serveur occupait :3001, pas de `.env.local` dans le worktree, SW prod-only). Le spec `apps/web/playwright/pwa-install-banner.spec.ts` est écrit + committé, runnable sur **Supabase local seedé (`db-reset`) + :3001 libre** (cf. en-tête du spec). Seams de test guardés (`__PWA_TRIGGER_DELAY_MS__`, `__PWA_FORCE_FOCUS__`) jamais posés en prod.
- **offline.html** : palette dark uniquement (acceptable V0 ; `prefers-color-scheme` = amélioration future).
- **Action owner** : logo source idéal = SVG/PNG transparent (les icônes maskables sont générées depuis `logo.jpg` fond noir). Script reproductible : `apps/web/scripts/generate-pwa-icons.mjs`.
- **Branche non poussée** (worktree isolé) — push/PR sur demande.

---

## DSH-011 — pipeline data REPORTING (2026-06-12)

Arbitrages lead (worktree `feat-dsh-011-reporting-sync`) :

- **Pipeline data uniquement, AUCUN changement UI** : le graphe « Évolution » du dashboard V2 reste sur ses données demo jusqu'à DSH-012 (câblage UI = ticket suivant).
- **`readSheet`** : paramètre de plage **optionnel** ajouté (défaut inchangé pour les 6 feuilles existantes) ; `REPORTING` lue en `A1:E10000` car la série compte ~2 900+ lignes > plage par défaut `A1:AZ2000` (troncature silencieuse sinon).
- **REPORTING = 7ᵉ feuille OPTIONNELLE du sync** (insérée entre `Portefeuille` et `HISTORIQUE`) : tout échec (feuille absente, mapping KO) → **warning MOLLE** dans le rapport, jamais `success:false` — les 6 feuilles historiques restent le contrat dur.
- **Hypothèse produit V0** : quote-part membre dérivée = `portfolio_value × detention_pct` **actuel** (approximation documentée si la détention a changé historiquement ; point de départ de la série membre = `MAX` filtré à `joined_at`).
- Table `club_reporting_daily` (migration 034 : append-only/upsert par date, RLS lecture membres, écriture service-role) documentée dans `REC/DATA_MODEL.md` §2.10.

---

## Feedback Widget V0 (2026-06-13)

- **Réf** : `REC/standalone-exports/FeedbackSheet - Maquettes (standalone).html` (5 sections : topbar desktop, topbar mobile + dropdown thème, FeedbackSheet desktop 480px × 5 états, bottom-sheet mobile, GitHub Issue). Spec : `docs/superpowers/specs/2026-06-13-feedback-widget-design.md`. FLOW-014. QA : `docs/qa/QA_REPORT_2026-06-13-feedback.md` (**CONVERGÉ 97 %**, 14 captures `docs/audits/shots/qa-feedback-*`).
- **Architecture** : `FeedbackSheet` présentationnel pur (`packages/ui`, Radix Dialog, copy par props, **zéro dép i18n/data**) ; `AppTopbar` reçoit `onFeedback`/`feedbackLabel` ; câblage dans `AppChromeTopbar` (`useMessages()` pour l'objet labels). Server Action `apps/web/lib/feedback/actions.ts` (auth RLS, upload bucket privé `screenshots` + URLs signées, INSERT). Migration **036** (table `feedback` + RLS + bucket + trigger pg_net→edge NO-OP-sans-Vault). Edge Function `feedback-dispatch` (tri IA + fan-out résilient `Promise.allSettled` Discord/Notion/GitHub bug-only/Brevo).
- **REFONTE 2026-06-13 (owner)** : ⚠ l'attachement n'est PLUS un screenshot automatique (html2canvas retiré — comportement buggé/non désiré). Désormais **l'utilisateur uploade ses propres images via le sélecteur de fichiers natif, jusqu'à 3** (`FeedbackSubmission.imageDataUrls: string[]`, `MAX_FEEDBACK_IMAGES=3`, FileReader). UX : grille de vignettes + retrait par image + compteur `n/3` + hint « 3 images maximum ». DB : `feedback.screenshot_url` → **`screenshot_urls text[]`**. IA **non figée sur Anthropic** : couche `ai.ts` `callAi()` agnostique — providers `anthropic | openai | deepseek` via `FEEDBACK_AI_PROVIDER`/`FEEDBACK_AI_MODEL`/`FEEDBACK_AI_BASE_URL` + clés par provider (OpenAI & DeepSeek = API chat completions partagée). Multi-images propagées dans Discord/GitHub/Notion. QA refonte : `docs/qa/QA_REPORT_2026-06-13-feedback-upload.md` (**PASS**, 17 captures `qa-feedback-upload-*`). Branche `feat/feedback-widget` (rebranché depuis `origin/main`, sans les commits vote-anonyme).

### Arbitrages lead (NE PAS flaguer en QA)

- **A-FW-1 — Tutoiement (maquette) > vouvoiement (spec §6).** La maquette est intégralement au tutoiement et c'est la voix de l'app (« Ta quote-part »). Copy alignée maquette : « Un retour à partager ? », « Décris… », « Merci pour ton retour. », « Vérifie ta boîte mail », « Route capturée ». La spec §6 (vouvoiement) est un **placeholder déprécié**.
- **A-FW-2 — Attachement = upload utilisateur, PAS screenshot auto (refonte owner).** La maquette montre un état « screenshot-preview » (capture auto floutée) — **supersédé**. Le widget laisse l'utilisateur joindre ses propres images (≤3). Mention vie privée plurielle honnête : « Ces images seront partagées uniquement avec l'équipe technique. ». La divergence de l'état d'attachement vs maquette est **attendue, non pénalisée**. Le « floutage auto » de la maquette est sans objet (plus de capture auto).
- **A-FW-3 — `feedbackLabel` hors objet `AppTopbarLabels`** (prop simple `feedbackLabel ?? 'Retour'`) — choix d'API additif, non destructif.
- **M-001 corrigé** : titre d'erreur enrichi « Une erreur est survenue à l'envoi. Tes données ont été conservées. » (l'état error préserve déjà type+message → vrai et rassurant).
- **M-002 accepté** : aria-label « Retour » = libellé de la maquette (le widget s'appelle « Retour ») ; conservé pour cohérence visuelle + e2e.

### Dette / actions owner

- **Déploiement prod** : appliquer migration 036 (`screenshot_urls text[]`), déployer `feedback-dispatch` (`--use-api`, imports `.ts` explicites), peupler Vault (`feedback_dispatch_url`), poser secrets — **IA configurable** : `FEEDBACK_AI_PROVIDER` (anthropic|openai|deepseek, défaut anthropic) + `FEEDBACK_AI_MODEL` (optionnel) + `FEEDBACK_AI_BASE_URL` (optionnel) + la clé du provider choisi (`ANTHROPIC_API_KEY` | `OPENAI_API_KEY` | `DEEPSEEK_API_KEY`) ; puis `DISCORD_FEEDBACK_WEBHOOK_URL`, `GITHUB_TOKEN`+`GITHUB_REPO` (= `reseau-evolve-capital/reseau-evolve-capital.github.io` sauf repo dédié), `NOTION_TOKEN`+`NOTION_FEEDBACK_DB_ID`, créer la **DB Notion `feedback`** (Name/Type/Severity/Category/Page/Message/Screenshot).
- **ENV-01 (à vérifier en prod)** : en local le trigger est NO-OP (Vault vide) ; le happy-path submit reste `ok:true` (e2e vert). Vérifier en prod, après peuplement du Vault, que l'INSERT + dispatch renvoie bien succès UI.
- **Dette Storybook (hors prod, non aggravée)** : la story `Dark` pose `data-theme` sur un wrapper alors que le Radix Portal monte sur `<body>` → la story dark est trompeuse (l'app prod est correcte). Fix = `data-theme` sur `document.documentElement` dans le ThemeDecorator.
- **Env QA** : :3001 squatté par Cursor en IPv4 → dev server + e2e sur **:3011** (`E2E_BASE_URL`/`NEXT_PUBLIC_SITE_URL=http://localhost:3011`).
- **Story Storybook FeedbackSheet** : crash `useId` (double instance React) — dette hors périmètre app membre, ticket dédié.

## Feedback test #1 (Johanna · iOS) — wording, tooltips, états cotisations (2026-06-14)

> Branche `fix/feedback-johanna-01` (base `origin/main`). Ticket : `TICKET_feedback-test-johanna-01.md`. Design prompt : `REC/Phase2_Handoff/qa/DESIGN_PROMPT_feedback-johanna-01.md`. 4 chantiers (tooltips chiffres, états/légende cotisations, attestation iOS, install PWA). QA : 9/9 critères PASS (2 agents : vérif adversariale + visuel light/dark). Captures `docs/audits/shots/qa-johanna-*`.

- **Cotisations — 5 états** (`packages/ui` CotisationMonth + ContributionsTimeline) : Payé (`bg-brand-yellow` ✓) · En cours (`bg-data-neutral-50` point) · **En retard (`bg-data-negative` PLEIN** — corrige le bug « pastille trop pâle » : la légende montrait `data-negative-50`) · À venir (fond `bg-neutral-50` + **anneau pointillé `border-neutral-500`**) · Avant ton arrivée (`bg-neutral-100` atténué, tiret `–`). **La pastille de légende = remplissage EXACT de la cellule** (vérifié état par état). État `exempt` **supprimé** de la grille mensuelle (variant + légende + stories).
- **Bug `not_applicable`** : `apps/web/lib/data/contributions.ts` `deriveVariant(m, joinedAtYM, nowYM)` — mois `< joinedAt` (lu de `memberships.joined_at`) → `not_applicable` (jamais rouge) ; mois `> nowYM` → `future`. `exempt` DB → `not_applicable`. Tooltips/aria des cellules i18n via `CellLabels` (défauts FR, `cell.*` câblés depuis `page.tsx`/next-intl).
- **Tooltips chiffres** : réutilisent l'atome `InfoTip` (`@evolve/ui`) — slots optionnels présentationnels ajoutés à `DashboardHero.variationInfo`, `DashboardEvolutionChart.info`, `PortfolioTable.gainLossPctInfo`, `DataRow.perfInfo`. Posés sur variations/perf uniquement (quote-part, évolution, gain/perte total + par ligne), PAS les chiffres statiques.
- **Attestation iOS** : `ContributionsView.tsx` — `window.open(url,'_blank','noopener')` **synchrone** (1re action du onClick) au lieu de `fetch→blob→a.click()` post-`await` (bloqué par iOS Safari). Route GET sert déjà le PDF `inline` (cookie auth).
- **Install PWA** : caption non-positionnelle (`pwa.modal.step2Caption` = « Cherche "Sur l'écran d'accueil" », plus de « 5E EN PARTANT DU HAUT ») + nouvelle `versionNote` rendue à l'étape 2. Cas non-Safari iOS (`ios-other`) inchangé (invite déjà Safari).

### Arbitrages lead (NE PAS flaguer en QA)

- **A-JOH-1 — Pas de `molecules/InfoTooltip`.** Le ticket demandait un nouveau composant ; l'atome existant `atoms/InfoTip` remplit déjà 100 % de la spec (i 16px, zone 44px, tap/hover/focus/Esc, aria, glow, reduced-motion, jest-axe). Réutilisé tel quel → zéro doublon. **Validé owner.**
- **A-JOH-2 — Tooltips ciblés, pas exhaustifs.** (i) uniquement sur les chiffres porteurs d'une base temporelle (variation/évolution/gain depuis acquisition), pas sur détention %/total cotisé/valeur totale. **Validé owner** (éviter le bruit pour une testeuse non-investisseuse).
- **A-JOH-3 — Anneau « À venir » en `neutral-500`, pas `neutral-400`.** Le design prompt disait `n-400` « bien visible (AA) » mais `#B3B5B7` sur `#FAFAF9` = 1,97:1 < 3:1 (WCAG 1.4.11). Passé à `neutral-500` (#8A8B8C ≈ 3,3:1) — l'AA prime sur la valeur littérale du token.
- **A-JOH-4 — Tooltip variation quote-part : (i) desktop + explication dans `HeroDetailDialog` sur mobile.** Le hero mobile est un `<button>` (interactif imbriqué interdit) → le (i) est desktop-only ; sur mobile le tap ouvre `HeroDetailDialog` qui surface l'explication de la base (`quotePart.info`). Critère #1 servi sur les deux plateformes (Johanna = iPhone).
- **A-JOH-5 — `exempt` supprimé de la GRILLE mensuelle uniquement.** Le statut SYNTHÈSE membre `exempt` (enum DB `contribution_status`, ContributionStatusCard/MembersList/`statusValue`) reste défensivement (jamais déclenché, aucune migration). Conforme au ticket (`not_applicable` = état dérivé sans changement de schéma).

### Dette / actions owner

- **e2e non exécuté en session** (`:3001` squatté + stack Supabase/seed requis) : gate unit/story/typecheck/lint VERT (470 UI + 337 web) + QA visuel Storybook light/dark. Lancer côté owner : `pnpm --filter @evolve/web exec playwright test attestation.spec.ts cursor-pointer.spec.ts --workers=1` (sur `:3011`, cf. env QA). Test client attestation (event popup) ajouté.
- **Validation iPhone réel** : ouverture du PDF attestation (geste synchrone) + tutoriel PWA adaptatif sur ≥2 versions iOS.
- **Dette locale mois EN** : `monthLabel()` via `formatMonth` est figé fr-FR → le `{month}` des tooltips cellules reste en français même en locale EN (pré-existant, hors périmètre).

## Vote Anonyme V0 (2026-06-13)

- **Réf** : `Votes - Maquettes (standalone).html` — **à la racine du repo** (et non dans `REC/standalone-exports/`), servie sur `:8770`, toggle light/dark. 7 sections : 1·PollBanner, 2·PollVoteSheet (yes_no / single_choice / multiple_choice / short_text), 3·états post-vote (after_close/live), 4·PollResultsView, 5·page `/votes` (liste membre), 6·admin liste (`AdminPollRow`) + PollCreateForm (2 steps), 7·entrée menu avatar. Spec : `docs/superpowers/specs/2026-06-13-vote-anonyme-design.md`. FLOW-015. Critères visuels : `docs/qa/VISUAL.md#votes`.
- **Mapping standalone ↔ composants/routes** :
  - section 1 `PollBanner` (`packages/ui` molecule) → intégré `app/(app)/dashboard/page.tsx` (au-dessus des KPI, max 2 + variante `aggregate`).
  - section 2 `PollVoteSheet` (organism, 4 `questionType`) → `app/(app)/votes/[id]` (PollDetailView).
  - section 3 états post-vote → `PollResultsView` ou écran « résultats à la clôture » selon `results_visibility`.
  - section 4 `PollResultsView` (organism) → `/votes/[id]` (voté/clôturé) + `/admin/votes/[id]`.
  - section 5 page `/votes` → `PollsView` + `PollCard` (molecule), accès via menu avatar (pas BottomNav).
  - section 6 admin → `app/(app)/admin/votes` (`AdminPollsView`/`AdminPollRow`) + `app/(app)/admin/votes/nouveau` (`PollCreateForm` organism).
  - section 7 entrée « Votes » → dropdown avatar `AppTopbar`/`AppChrome` (conditionnel `hasPollActivity`).
- **Architecture** : composants `@evolve/ui` présentationnels purs (copy par prop `labels`, défauts FR, pattern `resolveLabels` comme `FeedbackSheet`, **zéro dép i18n/data**). `apps/web` câble nav, GA4 (`poll_banner_view`/`poll_banner_click`/`poll_vote_submitted`/`poll_results_viewed`/`poll_page_view`) et les Server Actions. Données via `@evolve/data/polls` (`hasVoted`/`submitVote`/`getPollResults`/`mapPollResults`). Migration **037** (`polls` + `poll_responses` + RLS + RPC `submit_vote`/`get_poll_results`/`has_voted` SECURITY DEFINER + cron `close_due_polls`).
- **Anonymat by design (niveau DB)** : `user_id` stocké uniquement pour `UNIQUE(poll_id,user_id)` + `has_voted()` ; **aucune policy SELECT** pour `authenticated` (REVOKE), `get_poll_results` ne retourne jamais `user_id`. Prouvé psql : `permission denied` sur `SELECT poll_responses` en rôle authenticated.

### Arbitrages lead (NE PAS flaguer en QA)

- **A-VA-1 — `get_poll_results` renvoie un `jsonb` enveloppé** `{ poll_id, question_type, total_responses, options:[{option,count,pct}], text_responses:[] }` (et non un `{option,count,pct}[]` nu de la spec §6) — plus riche (porte les textes anonymes §10 + le total), mappé en `PollResults` strict côté data. Aucune perte, aucun `user_id`.
- **A-VA-2 — `PollCreateForm` sans drag-and-drop** des options (add/remove à la place) — le DnD de l'annotation maquette est hors scope « présentationnel » et non listé dans les critères d'acceptation.
- **A-VA-3 — `PollResultsView short_text`** plafonne l'affichage à 3 réponses + « N autres réponses » (la maquette montre 3 + « … 6 autres réponses »).
- **A-VA-4 — Cron de clôture** planifié `0 * * * *` (horaire) via `close_due_polls()`, sans dépendre du Vault (s'exécute en local) ; renseigne aussi `closed_manually_at` (réutilise la colonne, fidèle au `UPDATE` spec §4).

### Dette / actions owner

- **`make db-types`** échoue sur le CLI Supabase 2.106.0 (`LegacyPlatformAuthRequiredError` — token requis même en local). Contournement appliqué : `SUPABASE_ACCESS_TOKEN=sbp_local npx supabase gen types typescript --local`. **Ticket infra mineur** : ajouter ce dummy token à la cible `db-types` du Makefile.
- **Supabase local** : `edge-runtime` ne démarre pas dans l'enveloppe sandbox (rlimit type 7 `operation not permitted`) ; démarrage avec `-x edge-runtime,imgproxy,studio,pooler,vector,realtime`. Sans impact sur le DB layer (tables/RLS/RPC) ni les e2e via PostgREST/Auth.
- **Env QA** : :3001 squatté par Cursor en IPv4 → dev server + e2e sur **:3011** (`E2E_BASE_URL`/`NEXT_PUBLIC_SITE_URL=http://localhost:3011`).
