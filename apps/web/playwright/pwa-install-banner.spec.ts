/**
 * Tests E2E — bannière d'installation PWA (PWA-001).
 *
 * Couvre les 4 cas (Android Chrome, iOS Safari, iOS Chrome/FF, standalone) + cooldown
 * + crash-safety. Réutilise le harness d'auth (magic link admin GoTrue, cf. helpers.ts)
 * et la fixture de seed (test@example.com).
 *
 * Déterminisme :
 *  - UA spoofé par `test.use({ userAgent })` → pilote `detectPwaCase`.
 *  - `seedPwaState` (addInitScript) pose le compteur de visites + raccourcit le délai du
 *    timer à 50 ms (`window.__PWA_TRIGGER_DELAY_MS__`, seam de test) pour ne pas attendre 8 s.
 *  - Android : on injecte un `beforeinstallprompt` synthétique (Chromium ne le tire pas en
 *    automation) avec `prompt()` + `userChoice` contrôlés.
 *
 * Prérequis d'environnement : Supabase local (54322) seedé + serveur dev sur :3001 servant
 * CE code (cf. playwright.config.ts). Le SW (offline) est prod-only et couvert hors dev.
 *
 * Réf : PWA-001, docs/superpowers/specs/2026-06-07-pwa-install-banner-design.md, helpers.ts.
 */

import { test, expect, type Page } from '@playwright/test'

import { loginAsSeedMember } from './helpers'

const UA = {
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36',
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iosChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126 Mobile/15E148 Safari/604.1',
}

const MOBILE = { width: 390, height: 844 }

/** Pré-pose l'état localStorage PWA + raccourcit le timer, AVANT tout chargement de page. */
async function seedPwaState(
  page: Page,
  partial: Partial<{
    pwaCase: string
    visitCount: number
    dismissCount: number
    nextEligibleAt: string | null
    permanentlyMigratedAt: string | null
    installedAt: string | null
  }> = {}
): Promise<void> {
  const state = {
    pwaCase: partial.pwaCase ?? 'android-chrome',
    visitCount: partial.visitCount ?? 1, // la visite du dashboard fera passer à 2 (seuil)
    dismissCount: partial.dismissCount ?? 0,
    lastDismissedAt: null,
    nextEligibleAt: partial.nextEligibleAt ?? null,
    installedAt: partial.installedAt ?? null,
    permanentlyMigratedAt: partial.permanentlyMigratedAt ?? null,
  }
  await page.addInitScript(
    ([key, value]) => {
      ;(window as unknown as { __PWA_TRIGGER_DELAY_MS__: number }).__PWA_TRIGGER_DELAY_MS__ = 50
      try {
        window.localStorage.setItem(key as string, value as string)
      } catch {
        /* noop */
      }
    },
    ['evolve.pwa.v1', JSON.stringify(state)]
  )
}

/** Override matchMedia pour simuler le mode standalone (app installée). */
async function forceStandalone(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const orig = window.matchMedia.bind(window)
    window.matchMedia = ((q: string) =>
      q.includes('display-mode: standalone')
        ? ({
            matches: true,
            media: q,
            addEventListener() {},
            removeEventListener() {},
          } as unknown as MediaQueryList)
        : orig(q)) as typeof window.matchMedia
  })
}

/** Injecte un beforeinstallprompt synthétique capturé par l'app (à appeler une fois sur le dashboard). */
async function injectBeforeInstallPrompt(
  page: Page,
  outcome: 'accepted' | 'dismissed'
): Promise<void> {
  await page.evaluate((o) => {
    const e = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: string; platform: string }>
    }
    e.prompt = () => Promise.resolve()
    e.userChoice = Promise.resolve({ outcome: o, platform: 'web' })
    window.dispatchEvent(e)
  }, outcome)
}

/** Met la page au premier plan + focus (le timer du trigger exige document.hasFocus()). */
async function ensureFocus(page: Page): Promise<void> {
  await page.bringToFront()
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Case 4 — Standalone : aucune bannière
// ─────────────────────────────────────────────────────────────────────────────
test.describe('standalone', () => {
  test.use({ userAgent: UA.android, viewport: MOBILE })

  test('mode standalone → aucune bannière', async ({ page }) => {
    await forceStandalone(page)
    await seedPwaState(page, { pwaCase: 'standalone', visitCount: 5 })
    await loginAsSeedMember(page)
    await ensureFocus(page)
    // On laisse le temps au timer (raccourci) de NE PAS déclencher.
    await page.waitForTimeout(500)
    await expect(page.getByText('Garde-la sous la main.')).toHaveCount(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Case 1 — Android Chrome : prompt natif
// ─────────────────────────────────────────────────────────────────────────────
test.describe('android chrome', () => {
  test.use({ userAgent: UA.android, viewport: MOBILE })

  test('2ᵉ visite → bannière → Installer → prompt accepté → disparaît', async ({ page }) => {
    await seedPwaState(page, { pwaCase: 'android-chrome', visitCount: 1 })
    await loginAsSeedMember(page)
    await injectBeforeInstallPrompt(page, 'accepted')
    await ensureFocus(page)

    const banner = page.getByText('Garde-la sous la main.')
    await expect(banner).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: 'Installer' }).click()
    await expect(banner).toHaveCount(0)
  })

  test('Plus tard → cooldown 7 j posé', async ({ page }) => {
    await seedPwaState(page, { pwaCase: 'android-chrome', visitCount: 1 })
    await loginAsSeedMember(page)
    await ensureFocus(page)

    await expect(page.getByText('Garde-la sous la main.')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: 'Plus tard' }).click()
    await expect(page.getByText('Garde-la sous la main.')).toHaveCount(0)

    const state = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('evolve.pwa.v1') ?? '{}')
    )
    expect(state.dismissCount).toBe(1)
    expect(state.nextEligibleAt).not.toBeNull()
    // ~7 jours dans le futur.
    const days = (Date.parse(state.nextEligibleAt) - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(6.5)
    expect(days).toBeLessThan(7.5)
  })

  test('cooldown écoulé → ré-affichage', async ({ page }) => {
    const past = new Date(Date.now() - 1000).toISOString()
    await seedPwaState(page, {
      pwaCase: 'android-chrome',
      visitCount: 3,
      dismissCount: 1,
      nextEligibleAt: past,
    })
    await loginAsSeedMember(page)
    await ensureFocus(page)
    await expect(page.getByText('Garde-la sous la main.')).toBeVisible({ timeout: 5000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Case 2 — iOS Safari : modale d'instructions
// ─────────────────────────────────────────────────────────────────────────────
test.describe('ios safari', () => {
  test.use({ userAgent: UA.iosSafari, viewport: MOBILE })

  test('bannière « Voir comment » → modale → Escape ferme', async ({ page }) => {
    await seedPwaState(page, { pwaCase: 'ios-safari', visitCount: 1 })
    await loginAsSeedMember(page)
    await ensureFocus(page)

    await expect(page.getByText('Ta part. Toujours avec toi.')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: 'Voir comment' }).click()

    // La modale (Radix Dialog) affiche le titre de l'étape 1.
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(/Partager/i)).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByText('Ta part. Toujours avec toi.')).toHaveCount(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Case 3 — iOS Chrome/Firefox : copie l'URL + toast
// ─────────────────────────────────────────────────────────────────────────────
test.describe('ios other', () => {
  test.use({
    userAgent: UA.iosChrome,
    viewport: MOBILE,
    permissions: ['clipboard-read', 'clipboard-write'],
  })

  test('bannière « Continuer dans Safari » → URL copiée + toast', async ({ page }) => {
    await seedPwaState(page, { pwaCase: 'ios-other', visitCount: 1 })
    await loginAsSeedMember(page)
    await ensureFocus(page)

    await expect(page.getByText('Ouvre-la dans Safari.')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: 'Continuer dans Safari' }).click()

    // Toast de confirmation visible.
    await expect(page.getByText('Adresse copiée')).toBeVisible()
    // Le presse-papier contient l'URL courante.
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip).toContain('/dashboard')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Crash-safety — localStorage qui throw ne casse pas le dashboard (exigence #1)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('crash-safety', () => {
  test.use({ userAgent: UA.android, viewport: MOBILE })

  test('localStorage.setItem qui throw (clé pwa) → dashboard rend, pas de bannière, pas de crash', async ({
    page,
  }) => {
    const fatal: string[] = []
    page.on('pageerror', (e) => fatal.push(e.message))

    await page.addInitScript(() => {
      ;(window as unknown as { __PWA_TRIGGER_DELAY_MS__: number }).__PWA_TRIGGER_DELAY_MS__ = 50
      const orig = Storage.prototype.setItem
      Storage.prototype.setItem = function (k: string, v: string) {
        if (String(k).startsWith('evolve.pwa')) throw new Error('blocked')
        return orig.call(this, k, v)
      }
    })

    await loginAsSeedMember(page)
    await ensureFocus(page)
    await page.waitForTimeout(500)

    // Le dashboard est rendu (on est bien sur la route, le chrome est monté).
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('main')).toBeVisible()
    // Pas de bannière (le store dégradé ne compte pas la visite).
    await expect(page.getByText('Garde-la sous la main.')).toHaveCount(0)
    // Aucune erreur fatale non interceptée.
    expect(fatal).toEqual([])
  })
})
