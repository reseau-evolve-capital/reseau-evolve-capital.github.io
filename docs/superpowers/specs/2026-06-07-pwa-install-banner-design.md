# PWA-001 — Système d'installation PWA · Design validé

> **Statut** : validé (brainstorming 2026-06-07). Worktree `feat/pwa-001-install-banner` (base `main`).
> **Ticket source** : `REC/Phase2_Handoff/backlog/tickets/PWA-001_install_banner.md`
> **Réf visuelle** : `REC/standalone-exports/PWA Install Banners (standalone).html` (servi sur :8770) — **source de vérité visuelle**, light + dark.
> **Objectif produit** : rendre `apps/web` réellement **installable sur l'écran d'accueil** comme une vraie app, via une bannière non-intrusive, **sans jamais crasher l'app** (exigence #1).

---

## 1. Réalité du code vs ticket (audit Phase 0)

Le ticket est détaillé mais part d'hypothèses fausses sur l'état réel. Deltas tranchés :

| Sujet                                   | Hypothèse ticket                                                                       | Réalité auditée                                                                                      | Décision                                                                                                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PWA déjà en place                       | « L'app est une PWA, vérifier le manifest »                                            | **Aucun manifest, aucun service worker, aucune icône.** L'app n'est PAS installable aujourd'hui.     | On **construit la fondation PWA** (manifest + SW + icônes). C'est le vrai prérequis.                                                                                    |
| Persistance dismiss                     | Supabase (table `member_pwa_dismiss` + RLS)                                            | L'install PWA est **par-appareil** ; un refus sur mobile ne doit pas masquer sur desktop.            | **localStorage** (par-appareil). Pas de migration/RLS/route. Plus correct + moins de surface de crash.                                                                  |
| Table membre                            | `members(id)` + `member_id = auth.uid()`                                               | Tables réelles : `users` (interrogée par `id = auth.uid()`) + `memberships`. Pas de `members`.       | Sans objet (pas de DB).                                                                                                                                                 |
| Analytics                               | 6 events vers Umami/Plausible                                                          | `apps/web/lib/analytics.ts` = Cloudflare Web Analytics, **`trackEvent()` no-op** (pas d'API events). | On câble les 6 events via le wrapper existant (prêts, mais pas de sink → critère #10 partiel, documenté).                                                               |
| Trigger                                 | Timer 8s reset à **chaque** interaction (scroll/input/modale/blur) + anti-vol-focus 2s | —                                                                                                    | **Robuste simplifié** : visite≥2 + cooldown + non-standalone + onglet visible & focus 8s + pas pendant saisie. Même ressenti, machine d'état bien plus simple/testable. |
| 3 variants Android/iOS-Safari/iOS-other | 3 composants séparés                                                                   | Layout identique, seuls copy + CTA + handler diffèrent.                                              | **1 composant paramétré** `PwaInstallSheet`. Le dispatch par case vit dans `apps/web`.                                                                                  |
| Offline                                 | Non spécifié                                                                           | Choix produit.                                                                                       | **Hors-ligne complet** mais **isolé + garde-fous** (voir §6). Dégradable sans toucher la bannière.                                                                      |

Hors-scope (déjà acté par le ticket) : placements alternatifs (top banner / floating toast / full modal), A/B test copy, i18n au-delà FR+EN, détection version iOS, banner desktop, push de rappel.

---

## 2. Architecture — 4 couches

Respecte CLAUDE.md : **présentationnel → `packages/ui`** (Storybook), **logique métier → `apps/web`**. `packages/ui` ne dépend jamais de `packages/data` ni d'i18n (copy via props).

### Couche A — Fondation PWA (`apps/web`)

- `app/manifest.ts` — Next Metadata route. `name: "Evolve Capital"`, `short_name: "Evolve"`, `icons` 192 + 512 + **maskable**, `start_url: "/dashboard"`, `display: "standalone"`, `theme_color: "#0E0C0D"`, `background_color: "#0E0C0D"`, `description` FR, `lang: "fr"`, `orientation: "portrait"`, `id: "/"`.
- **Icônes** générées depuis `apps/web/public/logo.jpg` → `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (padding safe-zone ~20% sur fond brand `#0E0C0D`), `apple-touch-icon-180.png`. ⚠️ logo.jpg = JPG fond noir → **flag owner** : un SVG/PNG transparent serait idéal (cf. mémoire `brand-logo`).
- `app/layout.tsx` (root) — ajouter `metadata.manifest = "/manifest.webmanifest"`, `metadata.appleWebApp` (capable + statusBarStyle + title), `metadata.themeColor`, `<link rel="apple-touch-icon">`. Monter `<PwaServiceWorkerRegistrar />` dans `<body>`.
- `public/sw.js` (JS pur, **non bundlé**) + `public/offline.html` — service worker versionné (voir §6).
- `next.config.ts` — CSP : ajouter `worker-src 'self'` (et vérifier `manifest-src 'self'`). **Ressource partagée — câblée par le lead.**

### Couche B — Logique PWA (`apps/web/lib/pwa/`) — testée Vitest

- `platform-detection.ts` → `detectPwaCase(): PwaCase` (pur, SSR-safe : `'unsupported'` si `window` absent).
- `dismiss-storage.ts` → store localStorage + **horloge injectable** (`now: () => number`). API : `readState()`, `recordVisit()`, `recordDismiss(case)`, `recordInstalled()`, `isPermanentlyMigrated()`, `getCooldownUntil()`. Tout en `try/catch` → si localStorage indispo (Safari privé / incognito) ⇒ **on n'affiche jamais** (edge case incognito couvert sans crash).
- `use-pwa-install.ts` → hook root. Compose detection + capture `beforeinstallprompt` (depuis le store module-level) + `appinstalled` + l'API publique :
  ```ts
  type UsePwaInstallReturn = {
    pwaCase: PwaCase
    shouldShowBanner: boolean
    isInstructionModalOpen: boolean
    promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
    openInstructionModal: () => void
    closeInstructionModal: () => void
    dismiss: () => void
    copyUrlToClipboard: () => Promise<boolean>
  }
  ```
- `use-install-banner-state.ts` → éligibilité + trigger simplifié (visite≥2, cooldown OK, non-standalone ; `visibilitychange` + `document.hasFocus()` + délai 8s ; pas pendant `:focus` sur input/textarea/select/contenteditable).
- `beforeinstallprompt-store.ts` → singleton module-level qui stocke l'event `beforeinstallprompt` capturé tôt (preventDefault) ; flag `appinstalled`.
- `register-sw.ts` → enregistrement SW guardé (`'serviceWorker' in navigator`, prod/https), `try/catch`, jamais de throw ; helper `clearPwaDataCaches()` (postMessage au SW) appelé au sign-out.

### Couche C — UI présentationnelle (`packages/ui`) — **Storybook + play + axe**

- `src/organisms/PwaInstallSheet/PwaInstallSheet.tsx` — bottom sheet. **Props uniquement, zéro window/i18n** :
  ```ts
  type PwaInstallSheetProps = {
    open: boolean
    headline: string
    subline: string
    badge: string // "Web app · sans App Store"
    ctaLabel: string // "Installer" | "Voir comment" | "Continuer dans Safari"
    dismissLabel: string // "Plus tard"
    ctaState?: 'default' | 'loading' | 'disabled'
    onCta: () => void
    onDismiss: () => void
    reducedMotion?: boolean // override testable ; sinon prefers-reduced-motion
  }
  ```

  - Container 100% width, `border-radius: 14px 14px 0 0`, `padding: 16px 16px max(32px, env(safe-area-inset-bottom)) 16px`, `background: var(--card)`, `box-shadow: var(--sh-pop)`, `border-top: 1px solid var(--border)`, `z-index: 50`.
  - Header : pastille « € » + « Evolve Capital » + badge (`aria-hidden`) ; bouton dismiss X (SVG 24, hit-target 44×44).
  - Headline `--text` 18px 700 ; subline `--text-sec` 14px 500 ; CTA primary `--accent`/`--accent-ink`, h48, `--r-md`, full-width ; dismiss ghost `--text-sec`.
  - Animation entrée `translateY(100%)→0` 320ms `--ease-dec` ; sortie `0→100%` 220ms ease-std ; reduced-motion → opacity 150ms.
  - `role="dialog"`, `aria-modal="false"`, `aria-labelledby` → id du headline. Focus auto CTA à l'ouverture (sauf interaction <2s — géré par le mount, prop `autoFocus` optionnelle).
- `src/organisms/IosInstallInstructions/IosInstallInstructions.tsx` — modale Radix `Dialog` 2 étapes :
  ```ts
  type IosInstallInstructionsProps = {
    open: boolean
    device: 'iphone' | 'ipad'
    onClose: () => void
    onStepView?: (step: 1 | 2) => void
    copy: {
      step1Title
      step1Body
      step1Caption
      step2Title
      step2Body
      step2Caption
      next
      done
      stepLabel(n, total)
    }
  }
  ```

  - `aria-modal="true"`, focus-trap (Radix), Escape ferme, retour focus au déclencheur. z-index 60.
  - Illustrations SVG **adaptées du HTML standalone** (Row 05) : iPhone Share en bas-centre / iPad Share en haut-droite (étape 1) ; menu Partager avec « Sur l'écran d'accueil » surligné `rgba(253,199,12,0.20)` (étape 2). Composants SVG internes, monochromes + accent jaune unique.
- Stories `*.stories.tsx` (convention existante, `@storybook/test`, play functions, `tags:['autodocs']`) : tous les cas, **light + dark** (décorateur `data-theme`), états CTA (default/hover via story/focus/loading/disabled), étape 1 & 2, iPhone & iPad. Play : open/dismiss, clavier (Enter/Escape), gestion focus, axe (addon-a11y).
- Barrel `src/index.ts` : exporter `PwaInstallSheet`, `IosInstallInstructions` + types.

### Couche D — Câblage (`apps/web/components/pwa/` + routes)

- `components/pwa/InstallBannerMount.tsx` (`'use client'`) — monté dans `app/(app)/layout.tsx` **dans** `<ToastProvider>`. N'**affiche** que si `usePathname() === '/dashboard'`. Compose `usePwaInstall` + `useInstallBannerState`. Dispatch case → copy (next-intl `useTranslations('pwa')`) → handler :
  - `android-chrome` : `promptInstall()` → `accepted` (track install + unmount) / `dismissed` (cooldown 3j).
  - `ios-safari` : `openInstructionModal()` (lazy `next/dynamic` import de la modale).
  - `ios-other` : `copyUrlToClipboard()` + `toast.success` (« Adresse copiée. Ouvre Safari et colle-la. »).
  - `standalone`/`desktop`/`unsupported` : rien.
  - **Enrobé d'un `ErrorBoundary`** local → une erreur bannière ne peut jamais tuer le dashboard.
- `components/pwa/PwaServiceWorkerRegistrar.tsx` (`'use client'`) — monté dans root `<body>` ; appelle `register-sw` au mount.
- `app/(app)/profil/InstallSection.tsx` — section « Installer l'app sur ton téléphone », visible si `isPermanentlyMigrated()` (dismissCount≥3) **ou** comme entrée manuelle permanente ; relance le flow du case courant.
- `lib/analytics.ts` — ajouter `analyticsEvents.pwa.*` (6 events) via `trackEvent`.
- `messages/fr.json` + `messages/en.json` — namespace `pwa` (copy §5).

---

## 3. Détection plateforme (`detectPwaCase`)

```ts
export type PwaCase =
  | 'android-chrome'
  | 'ios-safari'
  | 'ios-other'
  | 'standalone'
  | 'desktop'
  | 'unsupported'
```

Règles (ordre) : SSR → `unsupported` ; standalone (`matchMedia('(display-mode: standalone)')` || `navigator.standalone`) → `standalone` ; iOS (UA `iPhone|iPad|iPod` **ou** iPadOS desktop-mode : `Macintosh` + `maxTouchPoints>1`) + Safari → `ios-safari` ; iOS + non-Safari (CriOS/FxIOS) → `ios-other` ; Android + Chrome → `android-chrome` ; sinon `desktop`.

---

## 4. Persistance localStorage + cooldown

Clé `evolve.pwa.v1` :

```ts
type PwaDismissState = {
  pwaCase: PwaCase
  visitCount: number
  dismissCount: number
  lastDismissedAt: string | null // ISO
  nextEligibleAt: string | null // ISO
  installedAt: string | null
  permanentlyMigratedAt: string | null
}
```

Cooldown : 1er dismiss → +7j ; 2e → +30j ; 3e → `permanentlyMigratedAt = now` (plus jamais de bannière, lien permanent dans `/profil`) ; Android _prompt accepté puis annulé_ → +3j. `appinstalled` → `installedAt = now`, plus jamais de bannière. Changement de `pwaCase` entre sessions → état retraité comme neuf. Accès localStorage indisponible → état « vide » + jamais d'affichage.

---

## 5. Copy (FR = HTML standalone, source de vérité ; EN adapté du ticket)

| Case           | Headline FR                 | Sub FR                                                                                                    | CTA FR                | EN headline / sub / cta                                                                                                |
| -------------- | --------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| android-chrome | Garde-la sous la main.      | Installe Evolve Capital sur ton écran d'accueil. Ouvre ta part d'un geste, sans passer par le navigateur. | Installer             | Keep it within reach. / Install Evolve Capital on your home screen. Open your share in one tap. / Install              |
| ios-safari     | Ta part. Toujours avec toi. | Ajoute Evolve Capital à ton écran d'accueil en deux étapes. On te montre où appuyer.                      | Voir comment          | Your share, always with you. / Add Evolve Capital to your home screen in two steps. We'll show you how. / Show me how  |
| ios-other      | Ouvre-la dans Safari.       | L'installation se fait depuis Safari sur iPhone. On copie l'adresse — tu n'as qu'à la coller.             | Continuer dans Safari | Open it in Safari. / Install works from Safari on iPhone. We'll copy the address — just paste it. / Continue in Safari |

Communs : dismiss « Plus tard » / « Later » ; badge « Web app · sans App Store » / « Web app · no App Store » ; toast case 3 « Adresse copiée. Ouvre Safari et colle-la. » / « URL copied. Open Safari and paste it. ».
Modale iOS — étape 1 : « L'icône Partager, en bas de Safari. » + caption `EN BAS DE SAFARI` (iPad : haut-droite) ; étape 2 : « Sur l'écran d'accueil » + caption `5e DU HAUT`. Boutons « Étape suivante » / « C'est fait ».

> Règles copy : pas d'emoji, pas de « ! » marketing, rouge brand jamais près d'un chiffre/erreur, tokens stricts.

---

## 6. Service worker — hors-ligne complet, isolé, garde-fous

`public/sw.js`, versionné (`const VERSION = 'pwa-v1'`), `skipWaiting` + `clients.claim`. Stratégies :

- **App-shell + assets statiques** (`/_next/static/*`, icônes, polices, offline.html) : precache + cache-first.
- **Navigations** (`request.mode === 'navigate'`) : network-first → cache → `offline.html`.
- **GET API authentifiées** : **stale-while-revalidate** (lecture hors-ligne ; fraîcheur communiquée par l'indicateur « synchronisé il y a X min » **déjà présent** + un badge offline). Jamais présenté comme live.
- **JAMAIS caché** : routes auth (`/api/auth/*`, callbacks Supabase), **toute mutation** (POST/PUT/PATCH/DELETE), requêtes cross-origin non whitelistées.
- **Vidage au logout** : `clearPwaDataCaches()` (postMessage) purge les caches de données.
- **Garde-fous anti-crash** : SW enrobé en `try/catch` ; échec de `caches`/`fetch` ⇒ passthrough réseau ; versioning pour éviter l'asset périmé.
- **Isolation** : la couche « cache de données » est un module séparé du SW ⇒ si QA la juge instable, on dégrade en _shell-offline_ sans toucher à la bannière.

---

## 7. Sécurité anti-crash (exigence #1)

1. Tous les composants PWA sont **client-only** ; SSR rend `null` avant mount (pas d'accès `window`/`navigator` au render).
2. Chaque appel storage / clipboard / SW / `prompt()` en **try/catch** dégradant → jamais de throw dans l'arbre React.
3. **ErrorBoundary** autour de `InstallBannerMount`.
4. SW guardé (feature-detect + prod/https) ; échecs loggés, jamais propagés.
5. Données financières **jamais** présentées comme live hors-ligne (indicateur de fraîcheur + badge offline).
6. Couche cache-données isolée et dégradable.

---

## 8. Tests (4 couches, CLAUDE.md)

1. **Unit (Vitest)** — `platform-detection` (≥8 UA : Android Chrome, Safari iOS 17, CriOS, FxIOS, iPad desktop-mode, Safari macOS, standalone, SSR) ; `dismiss-storage` (horloge mockée : 7j/30j/permanent/3j, appinstalled, localStorage qui throw) ; `use-install-banner-state` (visite<2 no-show, cooldown actif no-show, standalone no-show, timer 8s, reset si saisie/blur) ; helpers SW purs (matching cache).
2. **Interaction (Storybook play)** — `PwaInstallSheet` (open/dismiss/états CTA/clavier/focus) ; `IosInstallInstructions` (2 étapes, Escape, focus-trap) ; light + dark.
3. **A11y** — `jest-axe`/addon-a11y : 0 violation AA sur sheet + modale ; AAA sur CTA primary.
4. **E2E (Playwright, `apps/web`)** — 1 scénario / case via spoof UA + injection `beforeinstallprompt` :
   - Android : bannière visible 2e visite → CTA → prompt mock → `accepted` (disparaît) / `dismissed` (cooldown).
   - iOS Safari : CTA « Voir comment » → modale → Escape ferme → focus revient.
   - iOS other : CTA → clipboard écrit + toast visible.
   - Standalone : aucune bannière.
   - Cooldown : refus → avancer le temps localStorage → re-show.
   - **Crash-safety** : localStorage qui throw → dashboard rend quand même, aucune bannière, pas d'erreur console fatale.
   - SW : enregistrement smoke (prod build) + navigation offline → `offline.html`.
   - `cursor-pointer.spec.ts` reste vert.
5. **Agent QA** — après implé : `qa-e2e` (flows) + `qa-a11y` (RGAA/axe) + `qa-visual` (runtime light/dark vs réf :8770). Boucle fix (max 3 itérations).

---

## 9. Analytics (câblés via no-op wrapper, prêts pour un sink V1)

`analyticsEvents.pwa` : `bannerShown({case,visitCount,dismissCount})`, `ctaClicked({case})`, `dismissed({case,dismissCount})`, `installCompleted({case})`, `iosInstructionsViewed({case,step})`, `clipboardCopied()`. Critère #10 « vérifier dans Umami » non atteignable aujourd'hui (documenté).

---

## 10. Orchestration & livraison

Worktree `feat/pwa-001-install-banner` (base `main`). Mode **orchestrateur** : PLANNER (plan) → IMPLEMENTER (TDD, gate workspace vert) → QA → ARBITER. Parallélise l'indépendant : **(A) fondation PWA** ∥ **(B) logique lib/pwa** ∥ **(C) UI packages/ui**, puis **(D) câblage** sérialisé (touche layout/barrels/next.config). Gate « fait » : critères OK + `make lint typecheck test` vert + tests de la couche touchée + e2e workers:1 + runtime light/dark + check i18n EN + parité fr/en. **Commits FR atomiques par lot. Pas de push, pas de PR** (sur demande). Arbitrages loggés dans `docs/audits/design-reference-map.md`.

### Plan de commits

- `feat(web): manifest PWA + icônes + métadonnées apple`
- `feat(web): service worker offline + registrar (isolé, garde-fous)`
- `feat(web): détection plateforme PWA + store dismiss localStorage` + `test(web): units détection + cooldown`
- `feat(ui): PwaInstallSheet + stories light/dark + play/axe`
- `feat(ui): IosInstallInstructions (modale 2 étapes) + illustrations + stories`
- `feat(web): hooks usePwaInstall + useInstallBannerState` + `test(web): units trigger`
- `feat(web): montage bannière (dispatcher) + section /profil + i18n fr/en`
- `chore(web): events analytics PWA`
- `test(web): e2e 4 cas + cooldown + crash-safety + smoke SW/offline`
