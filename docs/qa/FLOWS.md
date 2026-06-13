# FLOWS.md — Parcours utilisateur critiques (Evolve Capital · `apps/web`)

> **Source de vérité du QA.** Modifiable au fil de l'eau. L'agent `qa-orchestrator` lit ce fichier
> à chaque cycle pour savoir QUOI tester. Ajoute/édite un FLOW dès qu'une fonctionnalité majeure arrive.
>
> Conventions : `Criticité ∈ {HAUTE, MOYENNE, BASSE}`. Les régressions référencées (`#R-xxx`) sont
> détaillées dans [REGRESSIONS.md](./REGRESSIONS.md). Les réfs visuelles pointent vers [VISUAL.md](./VISUAL.md),
> l'a11y vers [RGAA.md](./RGAA.md).
>
> **Rappels environnement** (détaillés dans les agents `.claude/agents/qa-*.md`) :
>
> - App membre sur **`http://localhost:3001`** (PAS `127.0.0.1` — voir #R-024).
> - Login réel = magic link **flux PKCE** → récupérer le lien dans **Mailpit** (`http://127.0.0.1:54324/api/v1/messages`).
> - e2e Playwright = **seed propre** (`make db-reset`) + `SUPABASE_SERVICE_ROLE_KEY` exporté, `--workers=1`.
> - Réfs visuelles servies sur **`:8770`** avec **toggle light/dark** (toujours basculer les deux).
> - i18n : tout écran doit être correct **fr ET en** ; toggle thème doit marcher **clair ET sombre**.

---

## FLOW-001 · Authentification — magic link

**Criticité :** HAUTE · **Spec e2e :** `apps/web/playwright/auth.spec.ts`

**Étapes :**

1. `/login` → saisir un email **invité** (membre du club) → bouton « Recevoir mon lien » actif.
2. Soumettre → **transition visible** (« Envoi du lien… » + spinner), puis `/login/check-email` (animation enveloppe, email masqué).
3. Email reçu **brandé Evolve, lien uniquement** (PAS de code OTP « enter the code ») — sujet « Ton lien de connexion à Evolve Capital ».
4. Cliquer le lien → **réussite au 1er clic** (flux PKCE, vérif côté serveur) → session ouverte → dashboard (ou onboarding si non onboardé).
5. Email **non invité** → erreur « n'est pas encore invité » (403, pas d'envoi).
6. Lien **expiré/invalide** → redirect `/login/verify/expired` (écran brandé), pas de crash.

**Régressions connues :** #R-014 (expiré au 1er clic / PKCE non géré), #R-015 (email non brandé + code OTP), #R-016 (submit sans transition), #R-023 (template email non rechargé sans `supabase stop/start`).
**Critères visuels :** [VISUAL.md#login](./VISUAL.md) (split-panel desktop + dataviz de marque). **RGAA :** label email associé, focus visible, `prefers-reduced-motion` sur l'animation.

---

## FLOW-002 · Onboarding (1ère connexion)

**Criticité :** HAUTE · **Spec e2e :** `apps/web/playwright/auth.spec.ts` (flow complet) + `access.spec.ts` (invité)

**Étapes :**

1. 1ère connexion d'un membre **non onboardé** (`onboarding_completed=false`) → **redirigé vers `/onboarding/step-1`** (guard middleware).
2. Le **chrome onboarding** s'affiche : top bar (logo + « ONBOARDING · ÉTAPE X/3 » + « Besoin d'aide ? » + **toggle clair/sombre**) + progression segmentée. Step-1 desktop = 3 colonnes (rail + carte « 3 minutes » / form / témoignage). **Dark par défaut**, toggle fonctionnel.
3. **Champs pré-remplis** depuis la DB : prénom, nom, **téléphone, adresse** (jamais vides/`undefined`).
4. Upload avatar → **aperçu immédiat** (optimiste), puis l'avatar persiste.
5. Étape consentements : cocher charte + confidentialité (CTA gated). Les liens « lire » la charte/confidentialité ouvrent **dans un nouvel onglet** (l'onboarding ne perd pas son état).
6. Tour guidé (carrousel) → CTA « Accéder à mon espace » → dashboard. `onboarding_completed=true`.
7. Un user **déjà onboardé** sur `/onboarding/*` → redirigé vers `/dashboard`.

**Régressions connues :** #R-017 (onboarding jamais affiché — guard manquant), #R-018 (profil → /onboarding 404), #R-019 (champs non pré-remplis), #R-020 (onboarding **écrase** le tél synchronisé par du vide), #R-021 (aperçu avatar absent + CSP blob/storage), #R-022 (lien charte 404), #R-025 (perte d'état si lien légal en même onglet).
**Critères visuels :** [VISUAL.md#onboarding](./VISUAL.md) (`Login & Onboarding - Desktop-standalone.html`). **RGAA :** étapes annoncées (`progressbar`), focus, cibles ≥44px mobile, toggle accessible.

---

## FLOW-003 · Dashboard membre

**Criticité :** HAUTE · **Spec e2e :** `apps/web/playwright/dashboard.spec.ts`

**Étapes :**

1. Membre synchronisé connecté → dashboard **NON vide dès la 1ère connexion** : quote-part (valeur + %), total cotisé, statut. (Vue `member_quote_part` = vue normale `security_invoker`, toujours à jour.)
2. « Synchronisé il y a X » dérivé de `clubs.synced_at` (cohérent desktop **et** mobile).
3. Tap Hero → modale « Ta quote-part » ; Escape ferme.
4. Données périmées (>2h) → badge « stale ».
5. Mobile : pull-to-refresh → 2ᵉ requête `/api/dashboard`.

**Régressions connues :** #R-011 (dashboard vide 1re connexion — MV obsolète après re-key), #R-012 (« synchronisé il y a 2h » figé / 2 sources).
**Critères visuels :** [VISUAL.md#dashboard](./VISUAL.md). **RGAA :** AAA sur la quote-part, hero nommé, nav clavier, focus.

---

## FLOW-004 · Portefeuille

**Criticité :** HAUTE · **Spec e2e :** `apps/web/playwright/portfolio.spec.ts`

**Étapes :**

1. `/portfolio` → donut + positions visibles. **Total = ligne d'agrégat « Portefeuille »** (col G de la matrice, persistée dans `portfolio_aggregates`), PAS la somme live.
2. Encart « Provisions et soldes » (Provision, Solde courts/longs termes) sous le donut.
3. Filtre par **secteur** ET par **typologie** (Offensif/Défensif/Autres).
4. Carte « dernière sync » en bas de colonne ; pas de doublon sur mobile.
5. Mobile : en-tête valo/donut **sticky** au scroll ; valo ne déborde pas (375px) ; dark OK (bandeau sync thémé).
6. Clic position → modale détail ; Escape ferme. Tri par performance change l'ordre.
7. Perte/delta négatif en **rouge dataviz** `data-negative` (#C53030), jamais le brand `#E93E3A`.

**Régressions connues :** #R-006 (total = somme positions au lieu de l'agrégat), #R-007 (agrégats Provision/Soldes manquants), #R-008 (typologie droppée), #R-009 (bandeau sync ne flippe pas en dark), #R-010 (positions fantômes accumulées).
**Critères visuels :** [VISUAL.md#portfolio](./VISUAL.md) (`Screens-Desktop` + `Screens-Mobile`). **RGAA :** AAA sur la valorisation, table accessible.

---

## FLOW-005 · Cotisations (membre)

**Criticité :** HAUTE · **Spec e2e :** `apps/web/playwright/contributions.spec.ts`

**Étapes :**

1. `/contributions` → carte **« Valeur nette détenue »** distincte, AU-DESSUS de « Total cotisé ».
2. KPI « Nombre de mois » = **compte réel** des mois payés (≠ 0, cohérent avec la frise).
3. Frise « historique mensuel » : année MAX = **année courante** (pas d'années futures vides jusqu'à 2051).
4. Mois en **retard** = ROUGE `data-negative` (pas ambre) ; alerte AAA lisible light + dark.
5. CTA « Télécharger l'attestation » → PDF (cf FLOW-010).

**Régressions connues :** #R-001 (valeur nette absente), #R-002 (nb mois = 0 car #ERROR! source), #R-003 (frise jusqu'à 2051), #R-004 (retard en ambre au lieu de rouge), #R-005 (cible tactile 24px<44px sur les cellules — dette).
**Critères visuels :** [VISUAL.md#contributions](./VISUAL.md). **RGAA :** AAA alertes retard (`--data-negative-strong`), cibles tactiles.

---

## FLOW-006 · Admin — Membres (trésorier/président)

**Criticité :** HAUTE · **Spec e2e :** `apps/web/playwright/admin.spec.ts`, `access.spec.ts` (a11y)

**Étapes :**

1. Accès `/admin/members` réservé **staff** (treasurer/president/network_admin) ; un member est redirigé vers `/dashboard`.
2. KPI « Membres actifs » + « À régulariser » (wording clair, PAS « in arrears » / « impayé »).
3. Alerte « X membres ont une cotisation à régulariser » (role=alert).
4. Filtre Tous/Actifs/Sortis avec **compte par option** (ex. Tous (37) / Actifs (21) / Sortis (16)).
5. Membre **sorti** : ligne atténuée + badge **« Ancien membre »** (PAS « Membre »). Pastille Accès lisible (AA).
6. Colonne Statut : libellés clairs ; absence de cotisation = « — » avec `title` explicite.
7. Switch « membres à régulariser » filtre la liste.

**Régressions connues :** #R-013a (wording « in arrears »), #R-013b (sorti affiché « Membre »), #R-013c (pas de compte par filtre), #R-026 (contraste badge Accès #68ac90 < AA quand opacité).
**Critères visuels :** [VISUAL.md#admin](./VISUAL.md). **RGAA :** axe 0 violation bloquante sur `/admin/members`, contraste AA.

---

## FLOW-007 · Admin — Cotisations (vue d'un membre)

**Criticité :** MOYENNE · **Spec e2e :** `apps/web/playwright/admin.spec.ts`

**Étapes :**

1. `/admin/cotisations?membre=<id>` → stats du membre, frise (même borne d'année courante que FLOW-005).
2. Carte « Valeur nette de la part » du membre **quand un membre est filtré**.
3. Select membre `w-full sm:w-56` (pas de débordement mobile).

**Régressions connues :** #R-001b (valeur nette membre absente côté admin), #R-003b (frise non bornée côté admin).
**RGAA :** combobox accessible.

---

## FLOW-008 · Invitations (staff)

**Criticité :** HAUTE · **Spec e2e :** `apps/web/playwright/access.spec.ts`

**Étapes :**

1. `/admin/invitations` → inviter un email → **doit être un membre du club** (sinon erreur claire « ne correspond à aucun membre »).
2. Succès → **lien d'accès copiable** affiché (état « lien à copier » en V0, pas « envoyé »).
3. Invitation apparaît « En attente » → **révoquer** → « Révoquée » (et si déjà acceptée, **verrouille l'accès**).
4. L'invité ouvre le lien → onboarding/accès.

**Régressions connues :** #R-027 (invitation d'un email hors club acceptée), #R-028 (révocation no-op si acceptée).
**RGAA :** axe 0 violation sur `/admin/invitations`.

---

## FLOW-009 · Synchronisation Sheets → Postgres

**Criticité :** HAUTE (BLOQUANT — conditionne toutes les données) · **Tests Deno :** `supabase/functions/sync/__tests__/sync.test.ts`

**Étapes (vérif DB après un sync) :**

1. **Rôles dérivés de PARAMETRAGES** : Président/Trésorier promus par matching nom normalisé ; les autres = member ; **idempotent** (re-sync = mêmes rôles) ; **fail-safe** (0 dirigeant résolu → ne touche à rien) ; **network_admin JAMAIS rétrogradé** (même s'il est membre Base).
2. **Positions ET agrégats réconciliés** : ce qui disparaît de la matrice est `is_active=false` (pas d'accumulation de fantômes).
3. Bouton « Synchroniser » (staff) → **toast** succès/warning/erreur + refetch des données.
4. Erreur sync → message **rouge** `data-negative` (jamais gris discret).

**Régressions connues :** #R-029 (sync réinitialise le trésorier en member), #R-010 (positions fantômes), #R-030 (network_admin rétrogradé), #R-031 (pas de feedback sync), #R-032 (erreur sync pas rouge).
**Vigilance :** toute modif de `supabase/functions/sync/index.ts`, des mappers `packages/data/src/sheets/`, ou de `parametrages.mapper.ts` → **relancer les tests Deno** (PAS dans `make test`).

---

## FLOW-010 · Attestation de détention (PDF)

**Criticité :** MOYENNE · **Spec e2e :** `apps/web/playwright/attestation.spec.ts`, `verifier.spec.ts`

**Étapes :**

1. CTA `/contributions` → PDF généré (`/api/attestation/detention`, session-gated).
2. PDF contient : 4 chiffres clés, **« Capacité restante d'investissement »** (= plafond annuel − investi année courante), **nom du club à jour** (`clubs.name`), réf + QR vers `/verifier/{ref}`.
3. `/verifier/{ref}` (public) → document authentique + club (réf connue) ; réf inconnue → état neutre (sans rouge brand).

**Régressions connues :** #R-033 (capacité restante absente — résolu), #R-034 (« Hacked name » = stale, résolu après re-sync).
**RGAA :** page `/verifier` accessible publiquement.

---

## FLOW-011 · Profil membre

**Criticité :** MOYENNE · (pas de spec dédiée — couvrir en QA visuelle)

**Étapes :**

1. Menu profil (avatar topbar) → `/profil` (PAS 404 / PAS /onboarding).
2. Affiche nom, email, club, rôle, date d'entrée, **téléphone** (non vide si renseigné), **avatar** (net, object-cover, sinon initiales). Jamais `NaN`/vide → fallback « — ».
3. Light + dark OK.

**Régressions connues :** #R-018 (profil → 404), #R-020 (tél vide après onboarding), #R-021b (avatar déformé / non affiché).
**Critères visuels :** [VISUAL.md#profil](./VISUAL.md).

---

## FLOW-012 · Contrôle d'accès / verrou (ADM-007)

**Criticité :** MOYENNE · **Spec e2e :** `apps/web/playwright/access.spec.ts`

**Étapes :**

1. Trésorier bloque un membre → le membre est redirigé vers `/acces-suspendu` (écran dédié).
2. Déblocage → accès rétabli (plus de redirection).

**RGAA :** axe 0 violation sur `/acces-suspendu`.

---

## FLOW-013 · Transverse — i18n & thème

**Criticité :** HAUTE (transverse, à vérifier sur CHAQUE écran touché) · **Spec e2e :** `apps/web/playwright/i18n.spec.ts`

**Étapes :**

1. FR par défaut (sans cookie) ; EN via cookie `NEXT_LOCALE=en` → catalogue anglais, `lang=en`, **0 clé brute** affichée, **parité fr/en** des `messages/*.json`.
2. Le **temps relatif** se localise (« il y a 1 h » / « 1 h ago ») — les formatters monnaie/date restent `fr-FR` (décision i18n).
3. **Toggle clair/sombre** fonctionne sur login, onboarding, app (1 clic, pas de clic mort).
4. Aucune string en dur non internationalisée sur un écran membre (FR-only = défaut).

**Régressions connues :** #R-024 (temps relatif non traduit en EN), #R-024b (app n'hydrate pas via 127.0.0.1 → toggle mort).

---

## FLOW-014 · Feedback widget (retour membre)

**Criticité :** MOYENNE · **Spec e2e :** `apps/web/playwright/feedback.spec.ts` · **Spec design :** `docs/superpowers/specs/2026-06-13-feedback-widget-design.md`

**Étapes :**

1. Icône `MessageCircle` (aria-label « Retour ») dans l'`AppTopbar`, **entre le sélecteur de langue et le toggle thème** (desktop ET mobile, à côté de l'avatar). Sur mobile, le toggle thème est masqué de la barre et réinjecté dans le dropdown avatar (pattern `localeSwitcher`).
2. Clic icône → `FeedbackSheet` (modale centrée 480px desktop / bottom-sheet mobile). Titre « Un retour à partager ? ». États : **idle** (sélecteur Bug/Idée/Question + message + route capturée + bouton « Joindre des images ») → **images jointes** (grille de vignettes + retrait par image + compteur `n/3` + hint « 3 images maximum » à 3 + mention vie privée honnête) → **loading** (form opacity 0.5 + spinner) → **success** (check vert 56px + « Merci pour ton retour. » + « Vérifie ta boîte mail » + Fermer) → **error** (bandeau `data-negative` + Réessayer, conserve type+message+images).
3. Pièces jointes (refonte 2026-06-13) : **l'utilisateur uploade ses propres images** via le sélecteur de fichiers natif (`input[type=file] accept=image/* multiple`), **jusqu'à 3** (`MAX_FEEDBACK_IMAGES`). PLUS de screenshot automatique (html2canvas retiré). Optionnel ; aucune image si rien n'est joint.
4. Submit → Server Action (`apps/web/lib/feedback/actions.ts`) : auth membre (RLS), upload de chaque image (≤3, validation type+taille 5 Mo, échec d'une image non fatal) dans le bucket privé `screenshots` → URLs signées, INSERT `feedback.screenshot_urls[]`. Le trigger PG (`feedback_dispatch`) est NO-OP en local (Vault vide) ; en prod il déclenche l'Edge Function (tri IA **multi-provider** anthropic|openai|deepseek + fan-out Discord/Notion/GitHub bug-only/Brevo).
5. Copy **tutoiement** (arbitrage lead, aligné maquette + voix « Ta quote-part »), parité fr/en. Tokens design only, focus glow, cibles ≥44px, dialog accessible (focus-trap + Escape).

**Régressions à ne pas réintroduire :** R-035 (cursor-pointer sur l'icône + boutons du sheet). **Critères visuels :** [VISUAL.md#feedback](./VISUAL.md) (`FeedbackSheet - Maquettes (standalone).html`, basculer light **et** dark, desktop **et** mobile). **RGAA :** axe 0 violation sur le sheet ouvert ; mention vie privée **honnête** (pas de claim de floutage non implémenté).
**Note env QA :** :3001 squatté par Cursor (IPv4) → lancer l'app/e2e sur **:3011** via `E2E_BASE_URL=http://localhost:3011 NEXT_PUBLIC_SITE_URL=http://localhost:3011`.

---

## FLOW-015 · Vote anonyme (consultation des membres)

**Criticité :** HAUTE · **Spec e2e :** `apps/web/playwright/votes.spec.ts` · **Spec design :** `docs/superpowers/specs/2026-06-13-vote-anonyme-design.md` · **DB :** `supabase/migrations/037_polls.sql` (tables `polls`/`poll_responses`, RLS, RPC `submit_vote`/`get_poll_results`/`has_voted`, cron `close_due_polls`).

**Garantie d'anonymat (by design, niveau DB) :** `user_id` est stocké dans `poll_responses` uniquement pour la contrainte `UNIQUE (poll_id, user_id)` (1 vote/membre) et `has_voted()`. Il n'est **jamais** exposé : aucune policy SELECT pour `authenticated` (REVOKE effectif), et la RPC `get_poll_results` (SECURITY DEFINER) ne retourne **jamais** `user_id`. Preuve psql : `SELECT * FROM poll_responses` en rôle `authenticated` → `permission denied`.

**Étapes (membre) :**

1. **Découverte — bannière dashboard :** un vote `open` non répondu → `PollBanner` dorée (bordure gauche 3px) au-dessus des KPI cards. ≥2 votes → max 2 bannières ; au-delà, variante `aggregate` « X votes en attente → Voir tous » vers `/votes`. GA4 `poll_banner_view` (rendu) / `poll_banner_click` (CTA « Voter → »).
2. **Accès secondaire — entrée « Votes »** dans le dropdown avatar `AppTopbar` (entre Profil et Déconnexion), conditionnelle `hasPollActivity` (≥1 poll `open`|`closed` du club), badge count des votes à faire. **Pas** dans la BottomNav (décision spec §5). GA4 `poll_page_view` sur `/votes`.
3. **Page `/votes` :** onglets En cours / Clôturés, `PollCard` (badge doré « à voter », vert « ✓ Voté », participation + « Résultats → » pour les clôturés), `EmptyState` si vide.
4. **Voter (`/votes/[id]`) :** `PollVoteSheet` (modale 480px desktop / bottom-sheet mobile), badge « Vote anonyme ». 4 types : `yes_no` (Oui/Non/Abstention), `single_choice` (radio), `multiple_choice` (checkbox), `short_text` (textarea ≤280 + compteur + mention « visible de l'équipe sous forme anonyme »). Submit **désactivé** sans sélection. Mention « Votre réponse est définitive et ne pourra pas être modifiée. » avant le CTA. Submit → Server Action → RPC `submit_vote`. GA4 `poll_vote_submitted`.
5. **Après vote :** la bannière disparaît (`has_voted` = true). `after_close` → écran « résultats disponibles à la clôture » ; `live` → `PollResultsView` immédiat. GA4 `poll_results_viewed`.
6. **Vote définitif :** re-soumission impossible (UNIQUE + garde RPC `vote deja enregistre`).

**Étapes (admin — président/trésorier) :**

7. `/admin/votes` : `AdminPollsView` (onglets En cours / Brouillons / Clôturés, `AdminPollRow` = mini-barre participation + Voir résultats / Clôturer / kebab), CTA « + Nouveau vote ».
8. `/admin/votes/nouveau` : `PollCreateForm` 2 steps (titre+description+type 2×2 → options + paramètres `results_visibility`/`notify_by_email`/`closes_at`). Enregistrer brouillon (`draft`) ou Publier (`open`).
9. `/admin/votes/[id]` : résultats agrégés (jamais d'attribution) + clôture manuelle (`status='closed'`). L'admin voit les textes `short_text` sans pouvoir les relier à un membre.

**Régressions à ne pas réintroduire :** R-035 (cursor-pointer sur CTA bannière, options de vote, switches du form). **Anonymat** : aucune route/composant ne doit exposer `user_id` d'une réponse. **Critères visuels :** [VISUAL.md#votes](./VISUAL.md) (`Votes - Maquettes (standalone).html` à la racine, basculer light **et** dark, desktop **et** mobile). **RGAA :** axe 0 violation sur `PollVoteSheet` (radio group / checkbox group, focus, ≥44px), AAA sur les chiffres-clés des résultats. Parité i18n fr/en (namespace `votes`).
**Note env QA :** :3001 squatté par Cursor (IPv4) → lancer l'app/e2e sur **:3011** via `E2E_BASE_URL=http://localhost:3011 NEXT_PUBLIC_SITE_URL=http://localhost:3011`. Supabase local requis avec seed votes (migration 037 + `supabase/seed.sql`).
