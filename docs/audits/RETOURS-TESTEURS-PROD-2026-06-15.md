# Backlog — Retours premiers testeurs prod (2026-06-15)

> **Source** : conversation WhatsApp (PDF `Prod bug.pdf`) — premier testeur **Olivier** (membre simple, iPhone X/Safari + Android/Firefox) après le dernier déploiement prod (`main`), échanges avec le dev **Amir**. + 1 bug UX ajouté par l'owner (og:image WhatsApp).
> **Méthode** : triage orchestré, 5 sous-agents investigateurs **read-only** ont relié chaque retour au code responsable et proposé un correctif. **Aucune correction appliquée** — ce document est un backlog de décision.
> **Branche** : `fix/prod-feedback-triage` (depuis `origin/main`, HEAD = `72061c2` garde-fou valorisation).
> **Statut** : à arbitrer par l'owner avant implémentation.

## Légende

- **Catégories** : `Bug` (défaut) · `Amélioration` (existe mais à affiner) · `Suggestion` (nouvelle valeur).
- **Sévérité** : `Bloquant` > `Majeur` > `Mineur`.
- **Effort** : `S` (≤ ½ j) · `M` (1–2 j) · `L` (> 2 j ou cadrage produit requis).

---

## Tableau de synthèse

| ID        | Titre                                                                 | Catégorie        | Sévérité | Effort V0      | Module / fichiers clés                                                        |
| --------- | --------------------------------------------------------------------- | ---------------- | -------- | -------------- | ----------------------------------------------------------------------------- |
| **RT-01** | PWA iOS : re-login forcé après installation (Safari)                  | Bug              | Majeur   | S→M            | `components/pwa/InstallBannerMount.tsx`, `profil/InstallSection.tsx`          |
| **RT-02** | Bouton (i) en chevauchement sur le « % » (cartes mobiles)             | Bug              | Majeur   | S              | `packages/ui/.../DataRow.tsx:85,94`                                           |
| **RT-03** | QR de l'attestation → page « référence inconnue »                     | Bug              | Majeur   | M              | `api/attestation/detention/route.ts`, migr. 023, `verifier/[ref]`             |
| **RT-04** | Faux popup « génération échouée » après succès                        | Bug              | Majeur   | S              | `contributions/ContributionsView.tsx:78`                                      |
| **RT-05** | Cotisations : alerte de retard affiche « 0,00 € »                     | Bug              | Majeur   | S→M            | `ContributionsView.tsx:191`, `contributions.ts:306`, migr. 033                |
| **RT-06** | Dashboard : « capacité de cotisation » ≠ réel (cotis. en avance)      | Bug (perception) | Majeur   | S (disclaimer) | `lib/data/dashboard.ts:116-140`                                               |
| **RT-07** | Blog : og:image non affiché sur WhatsApp                              | Bug              | Majeur   | S→M            | `apps/vitrine/.../blog/[slug]/page.tsx:76,81`, `lib/api.ts:357`               |
| **RT-08** | Portefeuille : remplacer court/long terme par « Liquidité » (ESPECES) | Amélioration     | Majeur   | M              | `sync/sheetParsers.ts:113`, `portefeuille.mapper.ts`, `PortfolioView.tsx:334` |
| **RT-09** | Dashboard : carte statut cotisation sans CTA                          | Amélioration     | Mineur   | S              | `messages/fr.json` (`dashboard.contributionMessage`)                          |
| **RT-10** | Portefeuille : wording « Remboursement en cours » ambigu              | Amélioration     | Mineur   | S              | `PortfolioView.tsx:347-356`                                                   |
| **RT-11** | Portefeuille : répartition par titre (en plus du secteur)             | Suggestion       | Mineur   | M              | `lib/data/portfolio.ts:215`, `AllocationDonut`                                |

**Positifs validés (aucune action)** : mode dark OK (#2) · approche « bancaire » (voir ses propres infos, pas la matrice comparative) appréciée (#7).

---

## 🎯 Périmètre du lot de résolution (décidé par l'owner — 2026-06-15)

| ID        | Décision      | Note                                                                                                                    |
| --------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| RT-01     | ✅ À traiter  | Option B (re-login attendu/indolore) ; vérif vrai iPhone = côté owner                                                   |
| RT-02     | ✅ À traiter  | Fix layout (i)/%                                                                                                        |
| RT-03     | ✅ À traiter  | QR vérifiable (persistance réf + RPC SECURITY DEFINER)                                                                  |
| RT-04     | ✅ À traiter  | Quick win 1 ligne                                                                                                       |
| RT-05     | ✅ À traiter  | **Formule confirmée** : `montant dû = nb mois de retard × clubs.min_contribution` quand la matrice est vide (cf. fiche) |
| **RT-06** | ⏸ **Reporté** | **On ne touche pas à la logique pour l'instant. Non traité dans ce lot.**                                               |
| RT-07     | ✅ À traiter  | og:image WhatsApp (vitrine, chirurgical)                                                                                |
| RT-08     | ✅ À traiter  | Section « Liquidité » = ESPECES                                                                                         |
| **RT-09** | ⏸ **Reporté** | **Non traité dans ce lot.**                                                                                             |
| RT-10     | ✅ À traiter  | **En bundle avec RT-08** (même section `PortfolioView.tsx:334-359`)                                                     |
| RT-11     | ✅ À traiter  | Vue par titre + **switch inspiré du toggle de la carte graphique du dashboard** (`DashboardEvolutionChart.tsx:129-154`) |

> Le prompt d'orchestration pour la résolution : **`docs/tickets/PROMPT-DEV-RESOLUTION-RETOURS-PROD-2026-06-15.md`**.

### ✏️ Résolu — branche `fix/resolution-retours-prod` (non poussée) · détail dans [`RESOLUTION-RETOURS-PROD-2026-06-15.md`](./RESOLUTION-RETOURS-PROD-2026-06-15.md)

| RT    | Statut                                                   | Commit(s)             |
| ----- | -------------------------------------------------------- | --------------------- |
| RT-01 | ✅ Résolu (copy ; device owner)                          | `a9d7914`             |
| RT-02 | ✅ Résolu                                                | `fdbc3cf`             |
| RT-03 | ✅ Résolu (⚠ migr 037 déjà en prod ; redeploy web owner) | `1f986e4`             |
| RT-04 | ✅ Résolu                                                | `47b96a4`             |
| RT-05 | ✅ Résolu                                                | `28f4e49`             |
| RT-06 | ⏸ Non traité (reporté)                                   | —                     |
| RT-07 | ✅ Résolu (rebuild vitrine owner)                        | `6514911`             |
| RT-08 | ✅ Résolu (redeploy sync + re-sync owner)                | `7e3d3f7` + `c833a02` |
| RT-09 | ⏸ Non traité (reporté)                                   | —                     |
| RT-10 | ✅ Résolu (bundle RT-08)                                 | `c833a02`             |
| RT-11 | ✅ Résolu                                                | `f070736` + `14a3c3a` |

Gate final intégré VERT (`make lint typecheck test` EXIT 0 ; Deno sync 38/38).

---

# 🐞 BUGS

## RT-01 — PWA iOS : re-login forcé après installation (Safari)

_(retour Olivier #1)_

- **Catégorie / Sévérité** : Bug / **Majeur** — non bloquant (l'app marche, le re-login via OTP finit par passer) mais touche **tout** l'écosystème iOS Safari à chaque installation ; vécu comme une régression vs Android.
- **Retour** : « Le PWA fonctionne sur les deux écosystèmes, néanmoins sur Apple il faut ré-onboarder post-installation, ce qui n'est pas le cas sur Android. »
- **Nuance importante** : ce n'est **pas un vrai ré-onboarding**. `onboarding_completed` est un flag **serveur par-utilisateur** (`types.gen.ts:730`, guard `middleware.ts:89`) → une fois reconnecté, le membre retombe direct sur le dashboard. Ce qu'Olivier appelle « ré-onboarder » = **se re-logger**.
- **Cause racine** :
  1. _Contrainte WebKit irréductible_ : la session Supabase est en **cookies** (`packages/data/src/supabase/server.ts:23`). iOS isole le jar de cookies de la webview PWA standalone de celui de Safari → la PWA démarre **sans session** → `start_url:'/dashboard'` (`manifest.ts:11`) → middleware redirige vers `/login`. (Android : prompt natif `beforeinstallprompt`, même conteneur de stockage → session préservée. D'où l'asymétrie.)
  2. _Le bug réel_ : le mécanisme de **handoff d'auto-connexion existe déjà** mais n'est câblé **que pour `ios-other`** (Chrome/Firefox iOS), **jamais pour `ios-safari`** — le cas du testeur :
     - `components/pwa/InstallBannerMount.tsx:100-103` → pour `ios-safari`, `handleCta` n'ouvre **que** la modale d'instructions ; `copyHandoffLink()` n'est appelé qu'en branche `ios-other` (`:106`).
     - Idem `app/(app)/profil/InstallSection.tsx:78-84`.
  3. _Hors de cause_ : le service worker (`public/sw.js:31-41`) exclut `/api/auth` et `/auth/` du cache (network-first) → il ne sert jamais une page authentifiée périmée. `manifest.ts` (`start_url`/`scope`/`id`) est correct.
- **Correctifs suggérés** (la session reste cookie/server-only dans tous les cas) :
  - **Option B — recommandée, à shipper en premier (S)** : rendre le re-login **attendu et indolore**. Dans la modale d'install iOS-Safari, annoncer « À la première ouverture, l'app te demandera ton code une fois — ensuite tu restes connecté » + s'appuyer sur l'OTP 6 chiffres déjà conçu pour la PWA (`login/check-email/OtpForm.tsx`). Neutralise le ressenti « régression » sans prétendre supprimer une contrainte WebKit.
  - **Option A — complément zéro-friction (M)** : minter un lien de handoff (`/api/auth/handoff-link`) au clic « Installer » pour que la `start_url` capturée auto-connecte au 1ᵉʳ lancement. Fragile (token OTP usage unique + TTL ~1h, ordre des gestes délicat).
  - **Option C (M)** : copier le lien handoff dans le presse-papier + guider le collage dans la PWA. Moins bon en UX que B.
- **Effort** : S (B seul) → M (B + A).
- **Vérif runtime (vrai iPhone Safari requise — non reproductible en Chromium)** : install → 1ᵉʳ lancement tombe sur `/login` (pas faux ré-onboarding) ; OTP fonctionne dans la webview standalone ; SW ne sert jamais de dashboard caché à une PWA déconnectée.
- **Liens** : mémoire `pwa-ios-handoff-magic-link` (le cas `ios-safari` n'y était pas couvert), `pwa-feedback-juin-fixes` (OTP PWA).

---

## RT-02 — Bouton info (i) en chevauchement sur le « % » (cartes mobiles)

_(retour Olivier #3)_

- **Catégorie / Sévérité** : Bug / **Majeur** — visuel cassé + tap-targets qui se chevauchent sur **toutes** les positions en vue mobile (usage PWA principal). Non bloquant (donnée lisible).
- **Retour** : « toutes les autres positions en dessous de NVIDIA ne s'affichent pas bien sur leur section droite […] le bouton i est en overlay sur le symbole "%". »
- **Cause racine** : `packages/ui/src/molecules/DataRow/DataRow.tsx:85` (et `:94`) place l'InfoTip en **absolu** `right-3 top-11` (= 12px / **44px**). Or la valeur `%` de perf est rendue dans la 2ᵉ ligne flex `justify-between` (`:53-60`), également calée à droite. Géométrie : `p-4` (16) + ligne nom (~20) + `mt-2` (8) ≈ **y=44px** = exactement le `top-11` de l'(i). L'icône 16px **+ sa zone de hit étendue `::after{-inset-3.5}`** (`InfoTip.tsx:111`) recouvre horizontalement le `%`. Le défaut est présent sur **toutes** les cartes (positionnement fixe, indépendant du contenu).
- **Correctifs suggérés** :
  - **Option 2 — recommandée, fix immédiat (S)** : ajouter `pr-6`/`pr-7` sur la `<span>` du `%` (`DataRow.tsx:54`) pour libérer la colonne droite occupée par l'(i).
  - **Option 1 (V1)** : restructurer pour sortir `%` + (i) dans une colonne dédiée hors du `<button>` (layout net sans overlay).
  - ⚠️ `DataRow` est partagé `@evolve/ui` → revérifier stories (`DataRow.stories.tsx`) + tests (`DataRow.test.tsx`).
- **Effort** : S.
- **Vérif** : light ET dark, mobile 375px, `%` long négatif (`-12,34 %`) et court, avec/sans Badge ; relancer `playwright cursor-pointer.spec.ts`.
- **Liens** : commit `8b419b1` (tooltips (i)), mémoire `sprint5-e-pft-portefeuille`.

---

## RT-03 — QR de l'attestation → page « référence inconnue »

_(retour Olivier #5)_

- **Catégorie / Sévérité** : Bug / **Majeur** — le QR est imprimé sur un document à valeur (preuve d'authenticité) et ne mène jamais à une confirmation pour l'attestation téléchargée à la demande. Défaut de confiance frappant.
- **Retour** : « quand on suit le QR code sur l'attestation ça nous renvoie sur une page d'erreur, c'est voulu ? »
- **Cause racine** : la référence encodée dans le QR n'est **jamais persistée** par le flux on-demand.
  - `app/api/attestation/detention/route.ts` génère le PDF mais **n'écrit jamais dans `attestation_sends`**.
  - La réf est déterministe (`packages/data/src/pdf/attestation.mapper.ts:208-211`, seed = `fullName|clubName|period`).
  - La page `/verifier/[ref]` résout via RPC `verify_attestation` qui **ne lit que `attestation_sends`** (`supabase/migrations/023_attestation_verification.sql:25-33`). Réf absente → 0 ligne → `verifier/[ref]/page.tsx:55` `row=null` → bloc **« référence inconnue »** (pastille warning, interprété comme « page d'erreur » — il n'y a pas de vrai `throw`/`not-found`).
  - **Seul le cron mensuel** (`supabase/functions/send-monthly-attestations/index.ts:277-282`) enregistre la réf → seule l'attestation **mensuelle envoyée par email** est vérifiable.
  - Aggravants à vérifier en prod : (a) base URL du QR construite depuis `request.url` (`route.ts:175`), **pas** `NEXT_PUBLIC_SITE_URL` → risque de host preview/interne ; (b) `period` par défaut on-demand = mois courant, alors que le cron cible le mois précédent → réfs non concordantes.
- **Correctifs suggérés** :
  - **Option A — recommandée (M)** : persister la réf on-demand (`upsert attestation_sends (membership_id, period, reference)`, idempotent via UNIQUE). ⚠️ RLS interdit l'INSERT membre (migr. 020) → passer par une **RPC `SECURITY DEFINER`** scoping `auth.uid()` (ne **jamais** introduire de service-role dans la route membre — CLAUDE.md). Aligner aussi la `period` par défaut.
  - **Option C — court terme cosmétique (S)** : adoucir le copy `/verifier` « unknown » (déjà : « vérifiables après l'envoi mensuel »).
  - Sécuriser la base URL du QR via fallback `NEXT_PUBLIC_SITE_URL`.
- **Effort** : M (A) / S (C seul).
- **Vérif** : scanner réellement le QR en prod (lire host + réf) ; après fix, scan → bloc vert « authentique » ; light/dark sur `/verifier`.
- **Liens** : mémoire `e-ntf-brevo-attestation` (limite connue), migrations 020/021/023.

---

## RT-04 — Faux popup « génération échouée » après une génération réussie

_(retour Olivier #6)_

- **Catégorie / Sévérité** : Bug / **Majeur** — faux état d'erreur systématique sur un parcours nominal réussi, **persistant** (jamais auto-fermé) et rejoué à chaque régénération. Détruit la confiance dans une fonctionnalité qui marche.
- **Retour** : « génération ok du premier coup, mais un popup intempestif demande si la génération a échoué […] dès qu'on régénère il réapparaît. »
- **Cause racine** : `window.open(url, '_blank', 'noopener')` renvoie **`null` même en cas de succès** quand `noopener` est présent (un contexte sans `opener` n'est pas retournable). Le code traite ce `null` comme « popup bloquée » :
  - `app/(app)/contributions/ContributionsView.tsx:78-84` → `if (!win) { setAttestationError(...); toast.error(...) }`. Texte = `attestation.error` (`fr.json:420`) = « La génération de l'attestation a échoué. Réessaie ? ».
  - **Persistance** : `toast.error()` est persistant par défaut (`duration:null` — `ToastProvider.tsx:29-33`).
  - **Réapparition** : chaque clic ré-exécute `open(...'noopener')` → re-`null` → re-toast.
  - **Régression introduite** par commit `6b6ebcc` (passage à `window.open` synchrone pour iOS) : l'ajout de `noopener` a cassé le test `if (!win)`.
- **Correctif suggéré** :
  - **Option A — recommandée (S)** : retirer `'noopener'` → `window.open(url, '_blank')`. Le retour redevient truthy en succès, `null` seulement si réellement bloqué. (Optionnel : `win.opener = null` après ouverture.)
  - **Option B** : garder `noopener` mais supprimer la branche `if (!win)` (ne plus se fier au retour) + n'afficher que le toast de succès.
- **Effort** : S (1 ligne + test).
- **Vérif** : clic → PDF s'ouvre + **toast succès uniquement**, aucun toast/erreur inline ; régénérer plusieurs fois → toujours OK ; **iOS Safari** : confirmer que l'ouverture synchrone marche toujours sans `noopener` ; cas popup réellement bloquée → erreur légitime.
- **Liens** : régression `6b6ebcc`, antérieur `7ccc242`, mémoire `qa2-mobile-feedback`.

---

## RT-05 — Cotisations : l'alerte de retard affiche « 0,00 € »

_(retour Olivier #10)_

- **Catégorie / Sévérité** : Bug / **Majeur** — affichage trompeur visible par un vrai membre (« retard de cotisation de 0,00 € »), contredit la règle CLAUDE.md « jamais de valeur vide/trompeuse à l'écran ».
- **Retour** : « je suis "en retard" + alerte rouge "tu as un retard de cotisation de 00 euros". » Dev : « le 00 vient de la colonne _Montant dû_ de la matrice, vide. Je vais maybe calculer ça côté serveur. »
- **Cause racine** : **double défaut** —
  - _Donnée_ : colonne « Montant dû » vide → `cotisations.mapper.ts:67` (`amount_due: row.amountDue ?? 0`) → `contributions.amount_due = 0` en DB → `contributions.ts:306` (`amountDue: Number(summary.amount_due ?? 0)`).
  - _Affichage_ : `ContributionsView.tsx:177-199` affiche le bandeau dès `status==='late'`, **sans condition sur le montant** → `formatEUR(0)` = « 0,00 € ».
  - ✅ Le **dashboard est déjà protégé** (`amountDue > 0 ? formatEUR(...) : null` dans `DashboardView`/`DashboardViewV2`) — **seul le bandeau de la page Cotisations** affiche « 0,00 € ».
- **✅ DÉCISION OWNER (2026-06-15) — formule confirmée** : quand la colonne « Montant dû » de la matrice est vide/nulle, **dériver le montant dû côté serveur** = `(nombre de mois en statut 'late', post-adhésion et ≤ mois courant) × clubs.min_contribution`. Ex. : 2 mois de retard → `2 × 100 € = 200 €`. `clubs.min_contribution` est connu par club (défaut 100 €, **configurable** par le staff, migr. `033`). Quand la matrice **fournit** un « Montant dû » > 0, on garde cette valeur source (priorité à la donnée explicite).
- **Implémentation attendue** (combiner les deux) :
  - **(1) Dérivation serveur** : dans `getContributionsData` (et là où le dashboard lit le montant), si `amount_due` source ≤ 0 → calculer `nbMoisRetard × clubs.min_contribution`. ⚠️ **le montant unitaire n'est PAS dans l'échéancier** (cellules mensuelles `late` ont `amount=0`, `detailsCotisations.mapper.ts:55`) → utiliser **le compte de mois `late`** × `clubs.min_contribution`. ⚠️ `clubs.min_contribution` n'est **pas** encore lu par `contributions.ts`/`dashboard.ts` → ajouter la lecture du club. Logique parallèle à `deriveContributionStatus` (commit `8797a48`).
  - **(2) Garde-fou affichage** : si après dérivation le montant reste `≤ 0` (ex. `min_contribution` indisponible), n'afficher **aucun** montant — clé `lateAlert.titleNoAmount` (« Tu as un retard de cotisation. ») au lieu de « 0,00 € ». **Jamais** « 0,00 € » à l'écran.
- **Effort** : M (dérivation serveur + lecture club + fallback + tests).
- **Vérif** : membre `late`, matrice vide, 1/2/3 mois de retard → montant = `n × min_contribution` ; matrice avec montant explicite > 0 → valeur source intacte ; `min_contribution` indisponible → pas de « 0,00 € » ; light/dark/EN.
- **Liens** : commit `8797a48` (modèle de dérivation serveur), migr. `033`, mémoire `e-qa1-corrections-post-test`, `sprint6-e-cot-cotisations`.

---

## RT-06 — Dashboard : « capacité de cotisation » ne reflète pas le réel

_(retour Olivier #11)_

> ⏸ **DÉCISION OWNER (2026-06-15) : NON TRAITÉ dans ce lot.** On ne touche pas à la logique pour l'instant. Conservé ici comme dette connue (disclaimer / calcul réel V1 à arbitrer plus tard).

- **Catégorie / Sévérité** : Bug (perception) / **Majeur** — chiffre financier potentiellement trompeur (le membre « voit » une capacité alors qu'il n'a rien cotisé cette année). Owner + testeur ont acté qu'un **disclaimer** suffit en V0.
- **Retour** : « je vois ma capacité de cotisation qui est celle de l'attestation mais j'ai rien cotisé cette année. » Dev : « les mois cotisés en avance sont déduits de la capacité restante. » Olivier : « Un simple disclaimer suffirait. »
- **Cause racine** : `lib/data/dashboard.ts:109-140` → `remaining = annual_investment_cap − Σ(amount des mois 'paid' de l'année calendaire)`. Les cotisations payées **en avance** comptent dans `yearInvested` et réduisent la capacité affichée vs la perception « réel cotisé cet exercice ». (C'est volontairement le même calcul que l'attestation, cf. commentaire `dashboard.ts:38-41`.)
- **Correctifs suggérés** :
  - **V0 — Disclaimer (S, recommandé, acté owner)** : enrichir le copy de l'`InfoTip` `dashboard.capacity.info` (déjà câblé aux 3 emplacements V1 + V2 : `DashboardView.tsx:199-215`, `DashboardViewV2.tsx:334-345` & `:457-465`) pour expliquer que « les cotisations payées d'avance sont déjà déduites ». **Aucun changement de composant.**
  - **V1 — Calcul réel (L)** : distinguer cotisations imputées à l'exercice courant vs payées d'avance (probablement via `paid_at`, non lu par `dashboard.ts`). Nécessite un **cadrage produit** (définition de « cette année »). Ticket follow-up.
- **Effort** : S (disclaimer) / L (calcul réel).
- **Vérif** : V2 (ruban mobile + card desktop) et V1, light/dark/EN ; `InfoTip` enrichi lisible au tap/hover/focus (a11y AA).
- **Liens** : mémoire `dashboard-v2-ab` (V2 active prod 100 %), `e-ntf-brevo-attestation`.

---

## RT-07 — Blog : og:image non affiché sur WhatsApp

_(bug ajouté par l'owner ; note Amir dans la conversation)_

- **Catégorie / Sévérité** : Bug / **Majeur** — WhatsApp = canal de partage n°1 du public REC ; aucune preview = perte de clics + crédibilité.
- **Contexte** : copier un lien d'article (vitrine) affiche la card sur Discord **mais pas WhatsApp**. Déjà réglé côté `apps/web` ; ici c'est lié au **site vitrine**. URL témoin : `https://reseauevolvecapital.com/fr/blog/investir-en-club-nouvelle-generation/`.
- ⚠️ **Contrainte** : `apps/vitrine` = site public prod, **« jamais refacto », fixes chirurgicaux uniquement**.
- **Cause racine** (mesurée en prod via `curl`/`sips`) — la balise og **est** dans le HTML statique (SSG OK, donc pas un souci JS), mais pointe sur l'**original photo brute de téléphone** :
  - `og:image = …/uploads/storage_emulated_0_DCIM_Camera_IMG_…jpg` → **content-length 1 191 419 ≈ 1,16 MB** (≈ 4× la limite sûre WhatsApp de 300 KB), **5616 × 2592 px**, ratio 2,17:1. WhatsApp (crawler strict, timeout court) rejette ; Discord (tolérant) redimensionne tout seul.
  - **Aucune balise `og:image:width` / `:height` / `:type` / `:secure_url`** (0 trouvée) car le code passe `images: [ogImage]` (string nue).
  - Aggravant : asset Strapi (CDN DigitalOcean) avec `cache-control: max-age=0` + ACAO vide.
  - Fichiers : `apps/vitrine/src/app/[locale]/blog/[slug]/page.tsx:76` (`ogImage = getStrapiMediaUrl(article.featuredImage)` → original) & `:81-92` (`openGraph.images:[ogImage]` string nue) ; `apps/vitrine/src/lib/api.ts:357-370` (`getStrapiMediaUrl` ignore `media.formats`). `metadataBase` est correct (`layout.tsx:22`) → l'URL est déjà absolue/https, **le souci est uniquement poids/format/pixels + balises manquantes**.
- **Découverte clé** : Strapi a **déjà généré les dérivés** de la même image, même CDN https, en `image/jpeg` :
  | dérivé | dimensions | poids |
  |---|---|---|
  | `large_` | 1000×462 | **71 KB** ✅ |
  | `medium_` | ~752px | 43 KB ✅ |
  | `small_` | ~500px | 21 KB ✅ |
  | original (utilisé) | 5616×2592 | **1163 KB** ❌ |
- **Correctifs suggérés** (chirurgicaux, zéro dépendance, méthode `apps/web`) :
  - **(a) — recommandé (S)** : pointer og:image sur `formats.large` (fallback `medium`→`small`→original) + déclarer `{ url, width, height, type:'image/jpeg' }` → Next émet `og:image:width/height/type/secure_url`. Couvre les 2 causes. 2 fichiers (`api.ts` helper + `generateMetadata`).
  - **(b) — complément (S→M)** : fallback og **local self-hosté** dans `apps/vitrine/public/` (comme `apps/web/public/og-app-evolve-capital.png` 1200×630/290 KB) pour les articles sans `featuredImage`.
  - **(c) — NON recommandé** : pipeline `sharp`/`satori` au build (absent du projet, `output:'export'`, ajoute complexité à un projet « jamais refacto »).
- **Effort** : S (a seul) → M (a+b + rebuild/redeploy vitrine manuel, **Strapi up sinon blog vide**).
- **Vérif** : `curl -sL <article> | grep og:image` (URL = `large_`, balises présentes) ; `curl -sI <og-url>` (`image/jpeg`, < 300 000) ; **Facebook Sharing Debugger** (re-scrape) ; test réel WhatsApp (lien neuf ou `?v=2`, cache crawler ~7 j).
- **Liens** : `apps/vitrine/CLAUDE.md` (règle vitrine + gotcha SSG/Strapi), mémoire `vitrine-blog-deploy-strapi-supabase`, méthode `apps/web/app/layout.tsx:23-44`.

---

# 🔧 AMÉLIORATIONS

## RT-08 — Portefeuille : remplacer « court terme » / « long terme » par une section « Liquidité » (= ESPECES)

_(retour Olivier #8 — décision actée dans la conversation)_

> ✅ **DÉCISION OWNER (2026-06-15) : À TRAITER dans ce lot.** À grouper avec RT-10 (même section UI).

- **Catégorie / Sévérité** : Amélioration / **Majeur** — le cash que le membre cherche n'est **affiché nulle part d'exploitable**, et un nombre négatif l'a perturbé. **Décision déjà prise** → prêt à implémenter.
- **Retour** : « je ne vois nulle part le cash actuel […] une simple section liquidité (montant positif ou négatif) est plus simple. » **Décision** : afficher la colonne **ESPECES** de la matrice (« vu que ça somme tout »).
- **Cause racine** (forensique matrice `docs/audits/sync-incident-2026-06-14/`) :
  - Court/long terme sont des **agrégats** de la feuille PORTEFEUILLE (col A label, col G valeur ; ex. « Solde : opérations longs termes » = **-4 840,92 €** → le négatif perturbant).
  - ⚠️ **Piège** : la ligne `ESPECES` a sa valeur en **col B** (« Symboles »), pas col G : `["ESPECES","159,08€","",...]`. Or `portefeuille.mapper.ts:10-15` ne classe en agrégat **que si `symbol` est vide** → ESPECES (symbol non vide) est classée comme **position** mal formée (`quantity=null`, `currentValue=0`), donc **invisible**. → c'est pourquoi le cash n'apparaît nulle part.
- **Correctifs suggérés** (les deux nécessaires) :
  - **Parsing (Edge `sync`)** : dans `parsePortefeuille` (`sheetParsers.ts:113-138`), cas dédié ESPECES → lire la valeur en **col B** (`toNumOrNull`) et la projeter en **agrégat** (`label="ESPECES"`, `symbol` forcé vide).
  - **Affichage (`PortfolioView.tsx:334-359`)** : extraire l'agrégat ESPECES → **section « Liquidité » unique** (un seul montant, positif **ou** négatif via token dataviz `--color-data-negative`, **jamais** rouge brand). **Masquer** « court terme »/« long terme ». Pas de `—` trompeur.
- **Effort** : M (parsing Edge + mapper + UI + i18n fr/en + tests 2 couches + **redeploy `sync` + re-sync** côté owner ; le gate ne lance NI Deno NI e2e).
- **Vérif** : light/dark/mobile ; ESPECES positif, négatif, absent.
- **Liens** : `docs/audits/sync-incident-2026-06-14/` (layout col B prouvé), mémoire `sync-googlefinance-collapse-guard` (le `159,08€` observé est la valeur post-effondrement ; en prod normale = vraie liquidité).

---

## RT-09 — Dashboard : carte « Statut cotisation » sans CTA

_(retour Olivier #9)_

> ⏸ **DÉCISION OWNER (2026-06-15) : NON TRAITÉ dans ce lot.**

- **Catégorie / Sévérité** : Amélioration / **Mineur** — la carte indique l'état mais ne dit pas quoi faire.
- **Retour** : « l'alerte statut cotisation n'envoie vers aucune action ; mets un CTA clair du genre "il faudra faire un virement de ta cotisation à ton club". »
- **Cause racine** : `packages/ui/src/molecules/ContributionStatusCard/ContributionStatusCard.tsx:53-122` n'a **aucune prop/rendu CTA**. (Le virement est externe → CTA = texte, pas forcément un lien.)
- **Correctifs suggérés** :
  - **Option A — recommandée (S)** : enrichir le message i18n `dashboard.contributionMessage.late/pending` (`fr.json`/`en.json`) avec la consigne d'action. Zéro changement de composant, couvre V1 + V2.
  - **Option B (M)** : prop `ctaLabel?`/`ctaHref?` (vers `/contributions`) rendue sous le montant + câblage `DashboardView.tsx:185-193` & `DashboardViewV2.tsx:425-434` + story + test.
- **Effort** : S (A) / M (B).
- **Vérif** : dashboard `late` ET `pending`, V2 (compact) + V1, light/dark/EN ; si B : `cursor-pointer.spec.ts` + jest-axe.

---

## RT-10 — Portefeuille : wording « Remboursement en cours » ambigu

_(retour Olivier #7b)_

- **Catégorie / Sévérité** : Amélioration (wording) / **Mineur** — aggravé par une valeur affichée « — » (vide).
- **Retour** : « je vois "remboursement en cours" — c'est quand on rembourse un membre sortant ? » (hypothèse correcte.)
- **Cause racine** : label brut de la matrice affiché verbatim. Ligne agrégat `{name:"Remboursement en cours", market_value:null}` (col A seule) → `PortfolioView.tsx:347-356` `<dt>{b.label}</dt>` + `<dd>… formatEUR : '—'</dd>` → « Remboursement en cours — » quand inactif.
- **Correctifs suggérés** :
  - **(1)** Tooltip InfoTip explicatif (copy via `t()`) : « Sommes en cours de remboursement à un ou plusieurs membres sortants. »
  - **(2)** Masquer les agrégats à `market_value == null` (réduit le bruit). Arbitrer : montrer « 0 € » vs masquer.
  - **(3)** Table de correspondance label sheet → libellé i18n FR (« Remboursement membre sortant »).
- **Effort** : S. (Même section UI que RT-08 → traiter ensemble.)
- **Vérif** : light/dark/mobile, avec et sans remboursement actif.

---

# 💡 SUGGESTIONS

## RT-11 — Portefeuille : répartition par titre (en plus du secteur)

_(retour Olivier #4 — dev a acté « ok je note »)_

> ✅ **DÉCISION OWNER (2026-06-15) : À TRAITER dans ce lot.** Ajouter la vue par titre **avec un switch inspiré du toggle de la carte graphique du dashboard** (`DashboardEvolutionChart.tsx:129-154`).

- **Catégorie / Sévérité** : Suggestion / **Mineur** — ajout de valeur, faible coût (donnée déjà présente).
- **Retour** : « la vue par titre complétée à celle par secteur serait la bienvenue. » Olivier précise : **répartition PAR ACTION/TITRE**.
- **Correctif (rectificatif vs hypothèse dev)** : le dev pensait « secteur seulement sur web » — **faux** : le donut sectoriel (`PortfolioView.tsx:314-333`) est **toujours rendu** (mobile + desktop) ; seule la **FilterBar** est masquée `< lg`. La donnée par-titre est **déjà disponible** (chaque `PortfolioPosition` porte `name`, `currentValue`, `allocationPct`, `portfolio.ts:209-212`).
- **Implémentation attendue** :
  - Ajouter `allocationByTitle` dans `buildPortfolio` (`portfolio.ts:163-230`, ~10 lignes, clé = `name`, tri desc).
  - **Switch « Par secteur / Par titre »** au-dessus du donut, **réutilisant le pattern du toggle de période de la carte graphique du dashboard** : `<div role="group" aria-label=…>` + `<button type="button" aria-pressed>` ; pill actif `bg-accent text-accent-ink`, inactif `bg-transparent text-text-sec` ; cible tactile ≥ 44px via pseudo `before:` ; `focus-visible:shadow-[var(--sh-glow)]` (cf. `DashboardEvolutionChart.tsx:129-154`). Idéalement **extraire un atome/molécule `SegmentedToggle`** réutilisé par les deux (dashboard + portfolio) plutôt que dupliquer — à arbitrer (sinon dupliquer le markup en restant fidèle au pattern).
  - `AllocationDonut` est déjà 100 % générique (accepte tout `AllocationItem[]`) → il swappe `data` selon le switch.
  - Regrouper « top N + Autres » pour la lisibilité mobile (sinon légende longue, palette qui cycle).
  - Copy du switch via props i18n (jamais d'i18n dans `@evolve/ui`).
- **Effort** : M (data triviale ; coût = switch UI + tokens + stories + tests + vérif light/dark/mobile).
- **Liens** : `packages/types/src/portfolio.ts:40` (`AllocationItem`), `DashboardEvolutionChart.tsx:129-154` (pattern toggle), mémoire `sprint5-e-pft-portefeuille`.

---

# ✅ Positifs validés (aucune action)

- **Mode dark** (Olivier #2) : « fonctionne bien, petit détail important pour moi ».
- **Approche « bancaire »** (Olivier #7) : « j'aime que l'app soit pensée pour voir ses infos et pas les siennes par rapport aux autres comme la matrice — approche différente et plus bancaire ». → confirme une décision produit clé.
- **Attestation** : numéro de club, adresse, noms/prénoms corrects (« ce qui me bluffe c'est l'attestation »). Reste : signature absente (chantier vérification clean/safe assumé par le dev) + RT-03/RT-04.

---

# 🧭 Notes transverses & contexte

- **Robustesse vs matrice indisponible (échange Olivier/Amir, 12:17–12:24)** : à la dernière AG, la matrice n'a pas pu être mise à jour (compte BD inaccessible). Olivier suggère de récupérer certaines données autrement ; Amir tranche : **« by design la matrice reste la source de donnée » en V0**, les trésoriers pourront saisir depuis la plateforme « au fur et à mesure » une fois le système éprouvé. → **non-action assumée**, à garder en tête (lié au garde-fou d'effondrement de valorisation, mémoire `sync-googlefinance-collapse-guard`). Pas de ticket V0.
- **Cotisations en avance** (lié RT-05/RT-06) : des membres remplissent des mois en avance → l'app doit, à terme, « montrer le réel montant ». Olivier : « un simple disclaimer suffirait » en attendant.
- **Regroupements pour l'implémentation** :
  - **Portefeuille** : RT-02 (overlay), RT-08 (liquidité), RT-10 (wording) — RT-08 + RT-10 touchent la **même section** `PortfolioView.tsx:334-359` → faire ensemble.
  - **Attestation** : RT-03 (data/migration) + RT-04 (1 ligne frontend) — indépendants ; RT-04 = quick win immédiat.
  - **Cotisations/Dashboard** : RT-05, RT-06, RT-09 partagent le copy i18n et la logique cotisation.
- **Règles à respecter sur tout correctif** : `formatEUR`/`formatPct` (`@evolve/utils`), tokens dataviz (jamais rouge brand `#E93E3A` pour une perte), pas de hex en dur, copy via props i18n dans `@evolve/ui`, jamais de `NaN`/`—` trompeur, a11y AA + `cursor-pointer.spec.ts` vert, vérif runtime **light & dark + EN**.

---

## Ordre d'exécution suggéré pour le lot (RT-06 & RT-09 exclus)

1. **Quick wins (S)** : RT-04 (faux popup, 1 ligne), RT-02 (overlay i/%).
2. **Impact moyen (M)** : RT-05 (dérivation `× min_contribution`), RT-08 + RT-10 (liquidité ESPECES + wording, même section), RT-07 (og WhatsApp, vitrine), RT-03 (QR vérifiable), RT-11 (vue par titre + switch).
3. **À part** : RT-01 (PWA iOS option B — partie UX/copy traitable ; vérif finale sur vrai iPhone = owner).

**Reportés (hors lot)** : RT-06 (capacité ≠ réel), RT-09 (CTA carte cotisation).
