# Design Reference Map — Evolve Capital (app membre `apps/web`)

> **Artefact persistant.** Carte « écran d'export ↔ route de l'app » + notes de direction graphique.
> Source de vérité graphique : `REC/standalone-exports/*.html` (auto-suffisants, rendus hors-ligne).
> Source de vérité fonctionnelle : `REC/Phase2_Handoff/docs/screens/*`, `design.md`, tickets `BACKLOG_E-*`.
> Réutilisable par les futurs audits ET les sessions d'implémentation. **Mettre à jour, ne pas régénérer.**
>
> Dernière mise à jour : 2026-06-05 (Sprint E-NTF : feedback in-app, emails, attestation). Captures de réf sous `docs/audits/shots/ref-*`.

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
