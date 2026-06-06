/**
 * Tests E2E — écran /dashboard (DSH-010).
 *
 * Le dashboard est l'écran le plus critique : ce fichier est le filet de sécurité E2E
 * + audit a11y. Réutilise le harness d'auth de auth.spec.ts (magic link admin GoTrue,
 * cf. playwright/helpers.ts) et la fixture de seed (test@example.com, « Club E2E »).
 *
 * 7 scénarios :
 *   1. Connexion → dashboard visible (libellé « Ta quote-part » + montant €).
 *   2. Données chargées (l'état chargé est asserté robustement ; le skeleton de
 *      loading.tsx est trop fugace pour être capté de façon déterministe — documenté).
 *   3. Données périmées (>2h) → badge « Données mises à jour … » (route /api/dashboard mockée).
 *   4. Tap Hero → modale détail « Ta quote-part » ; Escape ferme (couvre DSH-009).
 *   5. Pull-to-refresh (mobile 375px) → 2ᵉ requête /api/dashboard.
 *   6. Sans auth → redirect /login (middleware AUT-005).
 *   7. A11y — assertions manuelles (axe non installé) : libellé hero, montant nommé,
 *      BottomNav aria-label, bouton Hero focusable.
 *
 * Réutilise l'auth réelle (session GoTrue) car les RSC (layout + page) nécessitent une
 * session valide pour rendre le shell du dashboard ; la route /api/dashboard est mockée
 * pour rendre déterministes les scénarios 3/4/5 (données périmées, modale, refetch),
 * indépendamment de l'état de la DB de seed.
 *
 * Réf : DSH-010, DSH-007b, DSH-009, CLAUDE.md (a11y AA, copy FR, jamais de NaN/undefined).
 */

import { test, expect, type Page, type Route } from '@playwright/test'

import type { DashboardData } from '@/lib/data/dashboard'

import { loginAsSeedMember } from './helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures de données mockées
// ─────────────────────────────────────────────────────────────────────────────

/** DashboardData complète et déterministe. `syncedAt` paramétrable (fraîcheur). */
function makeDashboardData(syncedAt: string): DashboardData {
  return {
    member: {
      firstname: 'Léa',
      fullName: 'Léa Martin',
      role: 'member',
      joinedAt: '2024-01-01T00:00:00.000Z',
    },
    clubId: 'aaaaaaaa-0000-0000-0000-000000000001',
    netMarketValue: 12_345.67,
    detentionPct: 0.1234,
    totalContributed: 8_000,
    contribution: { status: 'ok', amountDue: 0 },
    club: { name: 'Club E2E' },
    syncedAt,
  }
}

/** Installe un mock 200 sur /api/dashboard renvoyant `data`. Retourne un compteur d'appels. */
async function mockDashboardRoute(
  page: Page,
  data: DashboardData
): Promise<{ count: () => number }> {
  let calls = 0
  await page.route('**/api/dashboard*', async (route: Route) => {
    calls += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    })
  })
  return { count: () => calls }
}

/**
 * Émule le geste pull-to-refresh sur le conteneur du dashboard.
 * DashboardView pose onTouchStart/onTouchMove sur le <div> racine quand `data` existe :
 * touchstart en haut (scrollY === 0) puis touchmove de dy > 70px → `invalidateQueries`.
 * `invalidateQueries` refetch TOUJOURS les queries actives (indépendamment de staleTime),
 * donc la route mockée s'applique de façon déterministe au rendu.
 *
 * Retourne false si le navigateur ne supporte pas TouchEvent (fallback géré par l'appelant).
 */
async function pullToRefresh(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    // Le conteneur tactile est le <div> racine de DashboardView (premier enfant du <main>).
    const container = document.querySelector<HTMLElement>('main > div > div')
    if (!container || typeof TouchEvent === 'undefined' || typeof Touch === 'undefined')
      return false
    window.scrollTo(0, 0)
    const mk = (clientY: number) =>
      new Touch({ identifier: 1, target: container, clientY, clientX: 100 })
    try {
      container.dispatchEvent(
        new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [mk(10)] })
      )
      container.dispatchEvent(
        new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [mk(120)] })
      )
      return true
    } catch {
      return false
    }
  })
}

/**
 * Force un refetch côté client pour que la route mockée s'applique au rendu.
 * `useDashboard` hydrate depuis `initialData` (RSC) ; sans déclencheur le client ne
 * refetch pas (staleTime=5min). On déclenche un pull-to-refresh (invalidateQueries) ;
 * fallback sur un cycle de focus fenêtre si TouchEvent indisponible.
 */
async function triggerClientRefetch(page: Page): Promise<void> {
  const ok = await pullToRefresh(page)
  if (!ok) {
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'))
      window.dispatchEvent(new Event('focus'))
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 1 : Connexion → dashboard visible
// ─────────────────────────────────────────────────────────────────────────────
test('connexion → dashboard visible (quote-part + €)', async ({ page }) => {
  // Données déterministes : un montant € non nul garanti, peu importe l'état du seed.
  await mockDashboardRoute(page, makeDashboardData(new Date().toISOString()))
  await loginAsSeedMember(page)
  await page.goto('/dashboard')
  await triggerClientRefetch(page)

  await expect(page.getByRole('button', { name: /Ta quote-part/i })).toBeVisible()
  // Le montant EUR FR utilise un NBSP : « 12 345,67 € ». On matche le symbole €.
  await expect(page.getByText(/€/).first()).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 2 : Skeleton → données chargées
//
// NB : le skeleton de loading.tsx (Suspense RSC) est trop fugace pour être capté de
// façon déterministe sans throttling fragile. On assert l'état CHARGÉ de façon robuste
// (le montant et les KPI sont rendus) plutôt que de courir après le skeleton.
// ─────────────────────────────────────────────────────────────────────────────
test('données chargées → montant + KPI visibles', async ({ page }) => {
  await mockDashboardRoute(page, makeDashboardData(new Date().toISOString()))
  await loginAsSeedMember(page)
  await page.goto('/dashboard')
  await triggerClientRefetch(page)

  await expect(page.getByRole('button', { name: /Ta quote-part/i })).toBeVisible()
  await expect(page.getByText('Ma détention')).toBeVisible()
  await expect(page.getByText('Total cotisé')).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 3 : Données périmées (>2h) → badge « Données mises à jour … »
// ─────────────────────────────────────────────────────────────────────────────
test('données périmées (3h) → badge stale visible', async ({ page }) => {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  await mockDashboardRoute(page, makeDashboardData(threeHoursAgo))
  await loginAsSeedMember(page)
  await page.goto('/dashboard')
  await triggerClientRefetch(page)

  // DashboardView affiche « Données mises à jour il y a 3 h. » quand stale (>2h).
  await expect(page.getByText(/Données mises à jour/i)).toBeVisible({ timeout: 10_000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 4 : Tap Hero → modale détail « Ta quote-part » ; Escape ferme (DSH-009)
// ─────────────────────────────────────────────────────────────────────────────
test('tap Hero → modale « Ta quote-part » ; Escape ferme', async ({ page }) => {
  await mockDashboardRoute(page, makeDashboardData(new Date().toISOString()))
  await loginAsSeedMember(page)
  await page.goto('/dashboard')
  await triggerClientRefetch(page)

  // Le Hero est un <button> (onClick fourni) portant le libellé « Ta quote-part ».
  const hero = page.getByRole('button', { name: /Ta quote-part/i })
  await expect(hero).toBeVisible()
  await hero.click()

  // La modale réutilise aussi le titre « Ta quote-part » → on scope la recherche au dialog.
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Ta quote-part')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 5 : Pull-to-refresh (mobile 375px) → refetch /api/dashboard
//
// DashboardView gère le pull-to-refresh via onTouchStart/onTouchMove sur le conteneur,
// déclenché quand window.scrollY === 0 et dy > 70px. Playwright ne synthétise pas de
// gestes tactiles natifs fiables ; on émule les TouchEvent React via dispatchEvent sur
// le conteneur, puis on vérifie qu'un 2ᵉ appel /api/dashboard part (invalidateQueries).
// ─────────────────────────────────────────────────────────────────────────────
test.describe('mobile', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true })

  test('pull-to-refresh → 2ᵉ requête /api/dashboard', async ({ page }) => {
    const probe = await mockDashboardRoute(page, makeDashboardData(new Date().toISOString()))
    await loginAsSeedMember(page)
    await page.goto('/dashboard')
    // L'écran rend les données de seed (RSC) ; le conteneur tactile est monté.
    await expect(page.getByRole('button', { name: /Ta quote-part/i })).toBeVisible()

    const callsBefore = probe.count()

    // Geste pull-to-refresh. Si TouchEvent indisponible, fallback déterministe (cycle de
    // focus → refetchOnWindowFocus) : on ne laisse PAS de test flaky dans la suite.
    const dispatched = await pullToRefresh(page)
    if (!dispatched) {
      await page.evaluate(() => {
        window.dispatchEvent(new Event('blur'))
        window.dispatchEvent(new Event('focus'))
      })
    }

    await expect.poll(() => probe.count(), { timeout: 10_000 }).toBeGreaterThan(callsBefore)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 6 : Sans auth → redirect /login (middleware)
// ─────────────────────────────────────────────────────────────────────────────
test('sans auth → redirect /login', async ({ page, context }) => {
  await context.clearCookies()
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 7 : Audit a11y — assertions manuelles (axe non installé).
//
// @axe-core/playwright n'est pas en devDeps (vérifié) ; on n'ajoute PAS de dépendance
// dans ce ticket. On assert manuellement les faits a11y clés du dashboard :
//   - le libellé hero « Ta quote-part » est présent (repère de l'écran) ;
//   - le montant principal a un nom accessible (aria-label via CurrencyAmount) ;
//   - le Hero est un bouton focusable au clavier ;
//   - la BottomNav (mobile) porte un aria-label.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('a11y', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true })

  test('repères a11y présents (hero, montant nommé, nav, focus clavier)', async ({ page }) => {
    await mockDashboardRoute(page, makeDashboardData(new Date().toISOString()))
    await loginAsSeedMember(page)
    await page.goto('/dashboard')
    await triggerClientRefetch(page)

    // Libellé hero présent.
    await expect(page.getByRole('button', { name: /Ta quote-part/i })).toBeVisible()

    // Montant principal avec nom accessible : le bouton hero est nommé « Ta quote-part :
    // 12 345,67 € … » (aria-label concis incluant le montant formaté NBSP).
    await expect(page.getByRole('button', { name: /12[\s  ]345,67[\s  ]€/ })).toBeVisible()

    // BottomNav mobile : nav nommée.
    await expect(page.getByRole('navigation', { name: /Navigation mobile/i })).toBeVisible()

    // Hero focusable au clavier : c'est un <button>, on peut le focus.
    const hero = page.getByRole('button', { name: /Ta quote-part/i })
    await hero.focus()
    await expect(hero).toBeFocused()
  })
})
