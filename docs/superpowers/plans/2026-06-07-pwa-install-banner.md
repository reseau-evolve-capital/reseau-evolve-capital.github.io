# PWA Install Banner (PWA-001) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read the spec first: `docs/superpowers/specs/2026-06-07-pwa-install-banner-design.md`. Visual source of truth: `REC/standalone-exports/PWA Install Banners (standalone).html` served on `http://localhost:8770`. Tokens: `packages/design-system/styles/tokens.css`.

**Goal:** Make `apps/web` truly installable to the home screen via a non-intrusive, crash-safe install banner covering 4 platform cases.

**Architecture:** 4 layers — (A) PWA foundation (manifest + service worker + icons) in `apps/web`; (B) PWA logic (detection, localStorage dismiss store, hooks) in `apps/web/lib/pwa`; (C) presentational UI (`PwaInstallSheet`, `IosInstallInstructions`) in `packages/ui` with Storybook; (D) wiring (mount + dispatcher + `/profil` section + analytics + i18n). Streams A/B/C are independent and parallelizable; D is serialized last.

**Tech Stack:** Next.js 16 App Router, React, TypeScript strict, Tailwind v4 (CSS tokens), Radix Dialog, next-intl, Vitest + @testing-library, Storybook (@storybook/test play functions, addon-a11y), Playwright.

**Conventions:** TS strict, no `any`, no hardcoded hex (use tokens), `cursor: pointer` covered globally, commits Conventional with scope ∈ {web|ui|...} and **lowercase subject**. Every interactive non-`<button>` needs `role`+`tabIndex`+`onKeyDown`. Run `make lint typecheck test` green before each commit; `pnpm --filter @evolve/web exec playwright test cursor-pointer.spec.ts --workers=1` after interactive changes.

---

## Shared types — define once, used across streams

### Task 0: PWA shared types in `packages/types`

**Files:**

- Create: `packages/types/src/pwa.ts`
- Modify: `packages/types/src/index.ts` (add `export * from './pwa'`)

- [ ] **Step 1: Create the types**

```ts
// packages/types/src/pwa.ts
export type PwaCase =
  | 'android-chrome'
  | 'ios-safari'
  | 'ios-other'
  | 'standalone'
  | 'desktop'
  | 'unsupported'

/** Cases that can actually show a banner. */
export type PwaPromptableCase = Extract<PwaCase, 'android-chrome' | 'ios-safari' | 'ios-other'>

export type PwaDismissState = {
  pwaCase: PwaCase
  visitCount: number
  dismissCount: number
  lastDismissedAt: string | null // ISO
  nextEligibleAt: string | null // ISO
  installedAt: string | null // ISO — set on appinstalled
  permanentlyMigratedAt: string | null // ISO — set when dismissCount reaches 3
}

export type PromptOutcome = 'accepted' | 'dismissed' | 'unavailable'
```

- [ ] **Step 2: Export from barrel** — add `export * from './pwa'` to `packages/types/src/index.ts`.
- [ ] **Step 3: Typecheck** — `pnpm --filter @evolve/types typecheck` → PASS.
- [ ] **Step 4: Commit** — `git add packages/types && git commit -m "feat(types): add pwa case + dismiss state types"`

---

## STREAM A — PWA foundation (`apps/web`)

### Task A1: Generate app icons from logo

**Files:**

- Create: `apps/web/public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon-180.png`
- Create: `apps/web/scripts/generate-pwa-icons.mjs` (reproducible)

- [ ] **Step 1: Write the generator script** using `sharp` (already transitively present; if not, run via `pnpm dlx`). Source `apps/web/public/logo.jpg`. Maskable = logo centered at ~60% on a `#0E0C0D` square (safe-zone). Non-maskable 192/512 = `contain` on `#0E0C0D`. apple-touch-icon 180 = same as 192 recipe at 180px.

```js
// apps/web/scripts/generate-pwa-icons.mjs
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
const BG = { r: 14, g: 12, b: 13, alpha: 1 } // #0E0C0D
const SRC = new URL('../public/logo.jpg', import.meta.url)
const OUT = new URL('../public/icons/', import.meta.url)
await mkdir(OUT, { recursive: true })
async function make(size, scale, name) {
  const inner = Math.round(size * scale)
  const logo = await sharp(SRC).resize(inner, inner, { fit: 'contain', background: BG }).toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(new URL(name, OUT).pathname)
}
await make(192, 0.82, 'icon-192.png')
await make(512, 0.82, 'icon-512.png')
await make(512, 0.6, 'icon-maskable-512.png') // safe-zone padding
await make(180, 0.82, 'apple-touch-icon-180.png')
console.log('icons generated')
```

- [ ] **Step 2: Run it** — `node apps/web/scripts/generate-pwa-icons.mjs` (or `pnpm dlx -p sharp node ...`). Expected: `icons generated` + 4 PNGs exist (`ls apps/web/public/icons`).
- [ ] **Step 3: Verify** sizes with `file apps/web/public/icons/*.png`.
- [ ] **Step 4: Commit** — `git add apps/web/public/icons apps/web/scripts && git commit -m "feat(web): generate pwa app icons from logo"`. (Flag to owner in PR/notes: transparent SVG/PNG source preferred over logo.jpg.)

### Task A2: Web app manifest

**Files:**

- Create: `apps/web/app/manifest.ts`

- [ ] **Step 1: Implement** the Next metadata manifest route:

```ts
// apps/web/app/manifest.ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Evolve Capital',
    short_name: 'Evolve',
    description: 'Ta quote-part, ton portefeuille de club, tes cotisations — en un geste.',
    lang: 'fr',
    start_url: '/dashboard',
    scope: '/',
    id: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0E0C0D',
    theme_color: '#0E0C0D',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
```

- [ ] **Step 2: Verify route** — `pnpm --filter @evolve/web dev` then `curl -s localhost:3001/manifest.webmanifest | head` shows valid JSON (or assert in build). Stop dev.
- [ ] **Step 3: Commit** — `git commit -am "feat(web): add pwa web app manifest"`

### Task A3: Service worker + offline page (full-offline, isolated, guarded)

**Files:**

- Create: `apps/web/public/sw.js`, `apps/web/public/offline.html`

- [ ] **Step 1: offline.html** — minimal standalone page (inline styles, brand bg `#0E0C0D`, FR text « Tu es hors-ligne. Reconnecte-toi pour voir tes données à jour. », a reload button). No external assets.

- [ ] **Step 2: sw.js** — versioned, guarded. Strategies per spec §6:

```js
// apps/web/public/sw.js
const VERSION = 'pwa-v1'
const STATIC = `evolve-static-${VERSION}`
const DATA = `evolve-data-${VERSION}`
const PRECACHE = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(
    caches
      .open(STATIC)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => {})
  )
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
      .catch(() => {})
  )
})
self.addEventListener('message', (e) => {
  if (e.data === 'clear-data-cache') caches.delete(DATA).catch(() => {})
})

const NO_CACHE = (url) =>
  url.pathname.startsWith('/api/auth') ||
  url.pathname.includes('/auth/') ||
  url.searchParams.has('no-store')

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return // never cache mutations
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // same-origin only
  if (NO_CACHE(url)) return

  // Navigations: network-first → cache → offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches
            .open(STATIC)
            .then((c) => c.put(request, copy))
            .catch(() => {})
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/offline.html')))
    )
    return
  }

  // Static assets: cache-first
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icons')) {
    event.respondWith(
      caches
        .match(request)
        .then(
          (r) =>
            r ||
            fetch(request).then((res) => {
              const copy = res.clone()
              caches
                .open(STATIC)
                .then((c) => c.put(request, copy))
                .catch(() => {})
              return res
            })
        )
        .catch(() => fetch(request))
    )
    return
  }

  // GET API data: stale-while-revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches
        .open(DATA)
        .then(async (cache) => {
          const cached = await cache.match(request)
          const network = fetch(request)
            .then((res) => {
              cache.put(request, res.clone()).catch(() => {})
              return res
            })
            .catch(() => cached)
          return cached || network
        })
        .catch(() => fetch(request))
    )
  }
})
```

- [ ] **Step 3: Commit** — `git add apps/web/public/sw.js apps/web/public/offline.html && git commit -m "feat(web): add offline service worker (versioned, guarded, isolated data cache)"`

### Task A4: SW registrar + root layout metadata

**Files:**

- Create: `apps/web/components/pwa/PwaServiceWorkerRegistrar.tsx`
- Create: `apps/web/lib/pwa/register-sw.ts`
- Modify: `apps/web/app/layout.tsx` (metadata.manifest/appleWebApp/themeColor/apple-touch-icon link; mount registrar in `<body>`)

- [ ] **Step 1: register-sw.ts**

```ts
// apps/web/lib/pwa/register-sw.ts
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  if (process.env.NODE_ENV !== 'production') return
  if (!window.isSecureContext) return
  try {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  } catch {
    /* never throw to the app */
  }
}

export function clearPwaDataCaches(): void {
  try {
    navigator.serviceWorker?.controller?.postMessage('clear-data-cache')
  } catch {
    /* noop */
  }
}
```

- [ ] **Step 2: PwaServiceWorkerRegistrar.tsx**

```tsx
'use client'
import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/pwa/register-sw'
import { captureBeforeInstallPrompt } from '@/lib/pwa/beforeinstallprompt-store'

export function PwaServiceWorkerRegistrar() {
  useEffect(() => {
    registerServiceWorker()
    return captureBeforeInstallPrompt() // returns cleanup
  }, [])
  return null
}
```

- [ ] **Step 3: root layout** — in `apps/web/app/layout.tsx`, extend `metadata`:
      `manifest: '/manifest.webmanifest'`, `appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Evolve' }`, `icons: { apple: '/icons/apple-touch-icon-180.png' }`; add `export const viewport = { themeColor: '#0E0C0D' }`. Mount `<PwaServiceWorkerRegistrar />` just before `<Analytics />` in `<body>`.
- [ ] **Step 4: gate** — `make typecheck` PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(web): register service worker + apple/manifest metadata"`

> **Note (Task D-lead, serialized):** add `worker-src 'self'` and `manifest-src 'self'` to the CSP in `apps/web/next.config.ts`. Do NOT edit next.config in parallel streams.

---

## STREAM B — PWA logic (`apps/web/lib/pwa`) — TDD

### Task B1: Platform detection

**Files:**

- Create: `apps/web/lib/pwa/platform-detection.ts`
- Test: `apps/web/lib/pwa/platform-detection.test.ts`

- [ ] **Step 1: Write failing tests** (≥8 UAs). Detection takes optional injected env for testability.

```ts
import { describe, it, expect } from 'vitest'
import { detectPwaCase } from './platform-detection'

const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36'
const IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IOS_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126 Mobile/15E148 Safari/604.1'
const IOS_FF =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/126 Mobile/15E148 Safari/604.1'
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const IPAD_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'

const env = (ua: string, standalone = false, maxTouchPoints = 0, navStandalone = false) => ({
  userAgent: ua,
  isStandaloneDisplay: standalone,
  maxTouchPoints,
  navigatorStandalone: navStandalone,
})

describe('detectPwaCase', () => {
  it('returns unsupported when no env (SSR)', () =>
    expect(detectPwaCase(undefined)).toBe('unsupported'))
  it('detects standalone via display-mode', () =>
    expect(detectPwaCase(env(ANDROID, true))).toBe('standalone'))
  it('detects standalone via navigator.standalone (iOS)', () =>
    expect(detectPwaCase(env(IOS_SAFARI, false, 5, true))).toBe('standalone'))
  it('detects android-chrome', () => expect(detectPwaCase(env(ANDROID))).toBe('android-chrome'))
  it('detects ios-safari', () =>
    expect(detectPwaCase(env(IOS_SAFARI, false, 5))).toBe('ios-safari'))
  it('detects ios-other for CriOS', () =>
    expect(detectPwaCase(env(IOS_CHROME, false, 5))).toBe('ios-other'))
  it('detects ios-other for FxiOS', () =>
    expect(detectPwaCase(env(IOS_FF, false, 5))).toBe('ios-other'))
  it('detects ios-safari for iPad desktop-mode', () =>
    expect(detectPwaCase(env(IPAD_DESKTOP, false, 5))).toBe('ios-safari'))
  it('detects desktop for mac safari (no touch)', () =>
    expect(detectPwaCase(env(MAC_SAFARI, false, 0))).toBe('desktop'))
})
```

- [ ] **Step 2: Run** `pnpm --filter @evolve/web exec vitest run lib/pwa/platform-detection.test.ts` → FAIL.
- [ ] **Step 3: Implement**

```ts
// apps/web/lib/pwa/platform-detection.ts
import type { PwaCase } from '@evolve/types'

export type DetectionEnv = {
  userAgent: string
  isStandaloneDisplay: boolean
  navigatorStandalone: boolean
  maxTouchPoints: number
}

export function readDetectionEnv(): DetectionEnv | undefined {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return undefined
  return {
    userAgent: navigator.userAgent,
    isStandaloneDisplay: window.matchMedia?.('(display-mode: standalone)').matches ?? false,
    navigatorStandalone: (navigator as unknown as { standalone?: boolean }).standalone === true,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  }
}

export function detectPwaCase(env = readDetectionEnv()): PwaCase {
  if (!env) return 'unsupported'
  if (env.isStandaloneDisplay || env.navigatorStandalone) return 'standalone'
  const ua = env.userAgent
  const isClassicIos = /iPhone|iPad|iPod/.test(ua)
  const isIpadDesktop = /Macintosh/.test(ua) && env.maxTouchPoints > 1
  const isIos = isClassicIos || isIpadDesktop
  const isSafari = /^((?!chrome|crios|fxios|android).)*safari/i.test(ua)
  if (isIos) return isSafari ? 'ios-safari' : 'ios-other'
  if (/Android/.test(ua) && /Chrome/.test(ua)) return 'android-chrome'
  return 'desktop'
}
```

- [ ] **Step 4: Run** → PASS (9 tests).
- [ ] **Step 5: Commit** — `git add apps/web/lib/pwa/platform-detection* && git commit -m "feat(web): pwa platform detection + unit tests"`

### Task B2: Dismiss storage + cooldown (localStorage, injectable clock)

**Files:**

- Create: `apps/web/lib/pwa/dismiss-storage.ts`
- Test: `apps/web/lib/pwa/dismiss-storage.test.ts`

- [ ] **Step 1: Write failing tests** — fake clock + in-memory storage; assert cooldown 7d/30d/permanent, android 3d, appinstalled, throwing storage.

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createDismissStore } from './dismiss-storage'

const DAY = 86_400_000
function memStorage(): Storage {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size
    },
  } as Storage
}
function throwingStorage(): Storage {
  return {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
  } as unknown as Storage
}

describe('dismiss store', () => {
  let now: number
  const clock = () => now
  beforeEach(() => {
    now = 1_700_000_000_000
  })

  it('starts empty', () => {
    const s = createDismissStore({ storage: memStorage(), now: clock })
    expect(s.read().visitCount).toBe(0)
    expect(s.read().dismissCount).toBe(0)
  })
  it('increments visits', () => {
    const s = createDismissStore({ storage: memStorage(), now: clock })
    s.recordVisit('android-chrome')
    s.recordVisit('android-chrome')
    expect(s.read().visitCount).toBe(2)
  })
  it('1st dismiss → +7d cooldown', () => {
    const s = createDismissStore({ storage: memStorage(), now: clock })
    s.recordDismiss('ios-safari')
    expect(s.getCooldownUntil()).toBe(now + 7 * DAY)
    expect(s.read().dismissCount).toBe(1)
  })
  it('2nd dismiss → +30d', () => {
    const s = createDismissStore({ storage: memStorage(), now: clock })
    s.recordDismiss('ios-safari')
    s.recordDismiss('ios-safari')
    expect(s.getCooldownUntil()).toBe(now + 30 * DAY)
  })
  it('3rd dismiss → permanently migrated', () => {
    const s = createDismissStore({ storage: memStorage(), now: clock })
    s.recordDismiss('ios-safari')
    s.recordDismiss('ios-safari')
    s.recordDismiss('ios-safari')
    expect(s.isPermanentlyMigrated()).toBe(true)
  })
  it('android rejected → +3d (shorter)', () => {
    const s = createDismissStore({ storage: memStorage(), now: clock })
    s.recordAndroidRejected()
    expect(s.getCooldownUntil()).toBe(now + 3 * DAY)
  })
  it('appinstalled → installed, never eligible', () => {
    const s = createDismissStore({ storage: memStorage(), now: clock })
    s.recordInstalled()
    expect(s.read().installedAt).not.toBeNull()
  })
  it('throwing storage degrades safely (empty, no throw)', () => {
    const s = createDismissStore({ storage: throwingStorage(), now: clock })
    expect(() => s.recordVisit('android-chrome')).not.toThrow()
    expect(s.read().visitCount).toBe(0)
  })
})
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `createDismissStore({ storage, now })` returning `{ read, recordVisit, recordDismiss, recordAndroidRejected, recordInstalled, isPermanentlyMigrated, getCooldownUntil }`. All reads/writes in try/catch; on any error return/keep the empty default state. Cooldown map: dismissCount 1→7d, 2→30d, ≥3→permanentlyMigratedAt set. Key `evolve.pwa.v1`. Default storage = `window.localStorage` when present. Export a default singleton `dismissStore` for app use.
- [ ] **Step 4: Run** → PASS (8 tests).
- [ ] **Step 5: Commit** — `git commit -am "feat(web): pwa dismiss store + cooldown logic (localStorage) + tests"`

### Task B3: beforeinstallprompt store + hooks

**Files:**

- Create: `apps/web/lib/pwa/beforeinstallprompt-store.ts`, `apps/web/lib/pwa/use-pwa-install.ts`, `apps/web/lib/pwa/use-install-banner-state.ts`
- Test: `apps/web/lib/pwa/use-install-banner-state.test.ts`

- [ ] **Step 1: beforeinstallprompt-store.ts** — module singleton. `captureBeforeInstallPrompt()` adds listeners for `beforeinstallprompt` (preventDefault + store event) and `appinstalled` (set flag + dismissStore.recordInstalled()); returns a cleanup fn. Exposes `getDeferredPrompt()`, `consumeDeferredPrompt()`, `wasInstalled()`. All guarded for SSR.
- [ ] **Step 2: use-install-banner-state.test.ts** — with `vi.useFakeTimers()` + mocked dismissStore: visitCount<2 ⇒ never shows; cooldown active ⇒ never; standalone ⇒ never; eligible + 8s elapsed while `document.hasFocus()` ⇒ shows; advancing timers without focus ⇒ no show. (Use `@testing-library/react` `renderHook`.)
- [ ] **Step 3: Run** → FAIL.
- [ ] **Step 4: Implement** `useInstallBannerState(pwaCase)` → `{ shouldShow, markShown }`. On mount: if promptable case & not standalone, `dismissStore.recordVisit(pwaCase)`; eligibility = `visitCount>=2 && !permanentlyMigrated && !installed && cooldownUntil<=now`. If eligible, start an 8s timer gated by `document.hasFocus()` + `document.visibilityState==='visible'`; on `visibilitychange`/`blur` clear, on regain restart; do not fire while `document.activeElement` is an editable field. `usefocus` listeners cleaned up. Implement `use-pwa-install.ts` composing detection + store + the API (`promptInstall` consumes deferred prompt, returns outcome, on dismissed → `recordAndroidRejected`; on accepted → store handles via appinstalled; `copyUrlToClipboard` uses `navigator.clipboard.writeText(location.href)` in try/catch).
- [ ] **Step 5: Run** → PASS. `make typecheck` PASS.
- [ ] **Step 6: Commit** — `git commit -am "feat(web): pwa install hooks (beforeinstallprompt capture, eligibility/trigger) + tests"`

---

## STREAM C — UI in `packages/ui` (Storybook + play + axe)

> Reference the standalone HTML on `:8770` for exact spacing/illustrations. Use tokens only. Components are pure (props in, callbacks out) — no `window`, no i18n, no data.

### Task C1: `PwaInstallSheet`

**Files:**

- Create: `packages/ui/src/organisms/PwaInstallSheet/PwaInstallSheet.tsx`, `index.ts`, `PwaInstallSheet.stories.tsx`
- Modify: `packages/ui/src/index.ts` (barrel)

- [ ] **Step 1: Component** — props per spec §2.C. Bottom sheet fixed to viewport bottom, `role="dialog" aria-modal="false" aria-labelledby={headlineId}`. Header (€ pastille, "Evolve Capital", badge `aria-hidden`, dismiss button X with `aria-label={dismissLabel}` and 44×44 hit target). Headline `<h2 id={headlineId}>`, subline `<p>`, full-width CTA button (`disabled` when `ctaState==='disabled'`; spinner + keep width when `'loading'`). Tokens: `bg-[var(--card)]`, `shadow-[var(--sh-pop)]`, `border-[var(--border)]`, CTA `bg-[var(--accent)] text-[var(--accent-ink)]`, radius `rounded-t-[14px]`/`rounded-[var(--r-md)]`. Entry/exit transform animation gated by `reducedMotion` prop (fallback `prefers-reduced-motion` via CSS). Render `null` when `!open` after exit. No hardcoded hex.
- [ ] **Step 2: Stories** — `title: 'Organisms/PwaInstallSheet'`, `tags: ['autodocs']`. Stories: `AndroidChrome`, `IosSafari`, `IosOther` (each with its copy), `CtaLoading`, `CtaDisabled`, plus a `Dark` decorator variant (wrap with `data-theme="dark"`). Play functions: click CTA asserts `onCta` called; click dismiss asserts `onDismiss`; keyboard `Tab` to CTA + `Enter`; assert `role=dialog` and `aria-labelledby` resolves. Use `@storybook/test` (`within`, `userEvent`, `expect`, `fn`).
- [ ] **Step 3: Barrel** — export `PwaInstallSheet` + `PwaInstallSheetProps` from `packages/ui/src/index.ts`.
- [ ] **Step 4: Gate** — `pnpm --filter @evolve/ui typecheck` PASS; build Storybook test or `pnpm --filter @evolve/ui test` if configured. Verify axe via addon in story.
- [ ] **Step 5: Commit** — `git add packages/ui && git commit -m "feat(ui): PwaInstallSheet bottom sheet + stories (light/dark) + play/axe"`

### Task C2: `IosInstallInstructions` (modal, 2 steps) + SVGs

**Files:**

- Create: `packages/ui/src/organisms/IosInstallInstructions/IosInstallInstructions.tsx`, `illustrations/IphoneShareStep.tsx`, `illustrations/IpadShareStep.tsx`, `illustrations/ShareMenuStep.tsx`, `index.ts`, `IosInstallInstructions.stories.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Illustrations** — port the SVGs from the standalone HTML Row 05 (iPhone with Share glyph bottom-center + yellow arrow; iPad with Share top-right; share menu list with "Sur l'écran d'accueil" row highlighted `rgba(253,199,12,0.20)`). Monochrome using `currentColor` + single accent `var(--accent)`. Each is a pure SVG React component with `aria-hidden`.
- [ ] **Step 2: Component** — Radix `Dialog` (`@radix-ui/react-dialog`). `Dialog.Root open={open} onOpenChange`. Content `role` handled by Radix; add `aria-labelledby`. Internal `step` state (1|2). Step header (`copy.stepLabel(step,2)` + short title), illustration (iphone/ipad for step1 via `device`; ShareMenu for step2), `H2` title, body `<p>`, mono caption, footer button "Étape suivante" (step1→2, calls `onStepView?.(2)`) or "C'est fait" (step2 → `onClose`). Escape closes (Radix default). z-index 60. Focus trap by Radix. Reset to step 1 when reopened.
- [ ] **Step 3: Stories** — `Step1Iphone`, `Step1Ipad`, full flow play (open → assert step1 title → click Next → assert step2 → press `Escape` → assert closed via `onClose`). Light + dark decorator. axe.
- [ ] **Step 4: Barrel + gate** — export; `pnpm --filter @evolve/ui typecheck` PASS.
- [ ] **Step 5: Commit** — `git add packages/ui && git commit -m "feat(ui): IosInstallInstructions modal (2 steps) + illustrations + stories"`

---

## STREAM D — Wiring (serialized; touches shared files)

### Task D1: i18n copy

**Files:** Modify `apps/web/messages/fr.json`, `apps/web/messages/en.json` (add `pwa` namespace per spec §5: headlines/sublines/cta per case, dismiss, badge, toastCopied, modal step copy, profileSection).

- [ ] Add identical key shape to both files (fr/en). **Parity check:** key sets must match. Commit `feat(web): pwa i18n copy fr/en`.

### Task D2: Analytics events

**Files:** Modify `apps/web/lib/analytics.ts` — add `analyticsEvents.pwa` with `bannerShown/ctaClicked/dismissed/installCompleted/iosInstructionsViewed/clipboardCopied` routing through existing `trackEvent`. Commit `chore(web): wire pwa analytics events`.

### Task D3: `InstallBannerMount` dispatcher + mount

**Files:**

- Create: `apps/web/components/pwa/InstallBannerMount.tsx`, `apps/web/components/pwa/InstallBannerErrorBoundary.tsx`
- Modify: `apps/web/app/(app)/layout.tsx` (mount `<InstallBannerMount />` inside `<ToastProvider>`)

- [ ] **Step 1: ErrorBoundary** — class component, `componentDidCatch` swallows + renders `null` (banner must never crash the dashboard).
- [ ] **Step 2: InstallBannerMount** (`'use client'`) — `usePathname()` gate (`=== '/dashboard'`); `usePwaInstall()` + `useInstallBannerState(pwaCase)`; `useTranslations('pwa')`; lazy `const IosInstallInstructions = dynamic(() => import('@evolve/ui').then(m => m.IosInstallInstructions), { ssr: false })`. Map case→copy/handler. On show, `analyticsEvents.pwa.bannerShown`. Render `<PwaInstallSheet>` + (case2) modal. Wrap entire render in `<InstallBannerErrorBoundary>`. Return `null` until mounted (SSR-safe).
- [ ] **Step 3: Mount** in `(app)/layout.tsx` as a child inside `<ToastProvider>` (client component inside server layout is fine).
- [ ] **Step 4: gate** — `make typecheck lint` PASS; `pnpm --filter @evolve/web exec playwright test cursor-pointer.spec.ts --workers=1` → 0 fail.
- [ ] **Step 5: Commit** — `feat(web): mount pwa install banner on dashboard (dispatcher + error boundary)`

### Task D4: `/profil` InstallSection + CSP

**Files:**

- Create: `apps/web/app/(app)/profil/InstallSection.tsx`
- Modify: `apps/web/app/(app)/profil/ProfileView.tsx` (render section), `apps/web/next.config.ts` (CSP worker-src/manifest-src), sign-out flow (call `clearPwaDataCaches()`).

- [ ] **Step 1: InstallSection** (`'use client'`) — uses store to show only if `isPermanentlyMigrated()` OR always as manual entry; button relaunches current-case flow (reuses `usePwaInstall`).
- [ ] **Step 2: CSP** — add `worker-src 'self'` + `manifest-src 'self'` to the CSP string in `next.config.ts`.
- [ ] **Step 3: sign-out** — locate sign-out handler; call `clearPwaDataCaches()` before redirect.
- [ ] **Step 4: gate** — `make lint typecheck test` PASS.
- [ ] **Step 5: Commit** — `feat(web): /profil install section + csp worker-src + clear pwa cache on logout`

---

## STREAM E — E2E (Playwright, `apps/web`)

### Task E1: PWA banner E2E flows

**Files:** Create `apps/web/playwright/pwa-install-banner.spec.ts`

- [ ] **Step 1** — helpers: spoof UA via `test.use({ userAgent })`; seed `localStorage` visitCount via `addInitScript`; inject a fake `beforeinstallprompt` event for Android; advance cooldown by writing a past `nextEligibleAt`.
- [ ] **Step 2** — scenarios: (a) Android 2nd visit → banner visible → CTA → mocked prompt accepted → banner gone; (b) Android dismissed → cooldown written; (c) iOS Safari → "Voir comment" opens modal → Escape closes; (d) iOS other → CTA → clipboard contains URL + toast visible; (e) standalone (display-mode) → no banner; (f) cooldown elapsed → re-show; (g) **crash-safety**: stub `localStorage.setItem` to throw via addInitScript → dashboard still renders, no banner, no fatal console error; (h) offline smoke: SW registers in prod build, navigate offline → offline.html.
- [ ] **Step 3** — run `pnpm --filter @evolve/web exec playwright test pwa-install-banner.spec.ts --workers=1`. Requires clean seed (`make db-reset` if needed) and a logged-in session per existing e2e helpers.
- [ ] **Step 4: Commit** — `test(web): e2e pwa install banner (4 cases + cooldown + crash-safety + offline)`

---

## Final

- [ ] **Full gate**: `make lint typecheck test` green; `pnpm --filter @evolve/web exec playwright test --workers=1` green; Storybook builds. Runtime check `/dashboard` light + dark + EN locale.
- [ ] **QA agents**: dispatch `qa-e2e`, `qa-a11y`, `qa-visual`; fix loop (≤3 iterations).
- [ ] **Docs**: append arbitrages to `docs/audits/design-reference-map.md`.
- [ ] **No push / no PR** unless asked.

---

## Self-review (coverage vs spec)

- Manifest/icons/SW/registrar → A1–A4 ✓ · CSP → D4 ✓
- Detection (8+ UA) → B1 ✓ · localStorage cooldown 7/30/perm/3d → B2 ✓ · hooks/trigger → B3 ✓
- PwaInstallSheet (1 param'd component, light/dark, states) → C1 ✓ · iOS modal + SVGs → C2 ✓
- Dispatcher + mount + ErrorBoundary → D3 ✓ · /profil section → D4 ✓ · analytics → D2 ✓ · i18n fr/en → D1 ✓
- E2E 4 cases + cooldown + crash-safety + offline → E1 ✓ · Storybook play/axe → C1/C2 ✓
- Crash-safety (client-only, try/catch, ErrorBoundary, guarded SW) → woven through A/B/D ✓
- Out of scope (Supabase table, alt placements) → intentionally omitted ✓
