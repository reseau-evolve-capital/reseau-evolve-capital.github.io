/**
 * Tests E2E — écran /portfolio (PFT-008).
 *
 * Réutilise le harness magic-link (loginAsSeedMember) + mocke /api/portfolio et
 * /api/market-prices pour un rendu déterministe (5 positions : 2 Technologie, 2 Santé, 1 Industrie).
 *
 * Stratégie d'hydratation :
 *   La page /portfolio est rendue côté RSC avec `initialData`. Le seed n'a pas de positions
 *   → `initialData = null` → PortfolioView affiche l'EmptyState (early return AVANT le conteneur
 *   onTouchStart/onTouchMove). Le pull-to-refresh du dashboard ne s'applique donc pas ici.
 *   On utilise le fallback focus (blur+focus) : `usePortfolio` a `refetchOnWindowFocus: true`,
 *   donc un cycle blur→focus déclenche un refetch, et la route mockée /api/portfolio s'applique.
 *   Résultat déterministe indépendant de l'état de la DB de seed.
 *
 * Desktop uniquement (1280×720 par défaut Playwright) : c'est PortfolioTable (`hidden md:block`)
 * qui porte les `data-testid="position-row"` sur les <tr>. Les cards DataRow (`md:hidden`) ne
 * sont pas rendues à ce viewport → `getByTestId('position-row')` matche uniquement la table.
 *
 * Scénarios : chargement (donut + lignes), filtre par secteur, ouverture modale + Escape, tri.
 * Lighthouse/CI : hors scope (décision de cadrage) — perf/a11y couvertes par jest-axe en unit.
 *
 * Réf : PFT-008, CLAUDE.md (a11y AA, copy FR, jamais de NaN/undefined).
 */

import { test, expect, type Page, type Route } from '@playwright/test'

import type { PortfolioData, PositionRow } from '@/lib/data/portfolio'

import { loginAsSeedMember } from './helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures de données mockées
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit une PositionRow minimale avec des valeurs par défaut.
 * Les champs `id`, `symbol`, `name` sont obligatoires ; les autres peuvent être surchargés.
 */
function row(
  over: Partial<PositionRow> & Pick<PositionRow, 'id' | 'symbol' | 'name'>
): PositionRow {
  return {
    category: 'Actions',
    sector: 'Technologie',
    quantity: 10,
    pump: 100,
    market_price_eur: 180,
    market_value: 1800,
    book_value: 1000,
    allocation_pct: 20,
    gain_loss_eur: 800,
    gain_loss_pct: 80,
    ...over,
  }
}

/** 5 positions déterministes : 2 Technologie, 2 Santé, 1 Industrie. */
const PORTFOLIO: PortfolioData = {
  clubId: 'aaaaaaaa-0000-0000-0000-000000000001',
  userRole: 'member',
  syncedAt: new Date().toISOString(),
  positions: [
    row({
      id: '1',
      symbol: 'NASDAQ:META',
      name: 'META',
      sector: 'Technologie',
      market_value: 145050,
    }),
    row({
      id: '2',
      symbol: 'NASDAQ:NVDA',
      name: 'NVIDIA',
      sector: 'Technologie',
      market_value: 506577,
    }),
    row({ id: '3', symbol: 'NYSE:JNJ', name: 'JOHNSON', sector: 'Santé', market_value: 30000 }),
    row({
      id: '4',
      symbol: 'NYSE:PFE',
      name: 'PFIZER',
      sector: 'Santé',
      market_value: 12000,
      gain_loss_pct: -10,
      gain_loss_eur: -500,
    }),
    row({
      id: '5',
      symbol: 'NYSE:CAT',
      name: 'CATERPILLAR',
      sector: 'Industrie',
      market_value: 8000,
    }),
  ],
}

/**
 * Installe les mocks sur /api/portfolio et /api/market-prices.
 * /api/market-prices renvoie un objet vide → pas de prix live → buildPortfolio utilise
 * le snapshot `market_value` (fallback défini dans buildPortfolio).
 */
async function mockPortfolio(page: Page): Promise<void> {
  await page.route('**/api/portfolio*', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(PORTFOLIO),
    })
  )
  // Pas de provider configuré → prix vides → fallback snapshot market_value.
  await page.route('**/api/market-prices*', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ prices: {} }),
    })
  )
}

/**
 * Force un refetch côté client pour que la route mockée s'applique au rendu.
 *
 * Le seed n'a pas de positions → initialData=null → PortfolioView affiche l'EmptyState
 * (early return avant le conteneur onTouchStart). Le pull-to-refresh ne s'applique pas.
 * Le staleTime=5min sur initialData empêche également le refetchOnWindowFocus de déclencher un fetch.
 *
 * Solution : QueryProvider expose window.__queryClient en NODE_ENV!=='production'.
 * On appelle invalidateQueries(['portfolio']) depuis page.evaluate → bypass du staleTime.
 */
async function triggerPortfolioRefetch(page: Page): Promise<void> {
  // Attendre que le QueryProvider soit monté et ait exposé __queryClient.
  await page.waitForFunction(() => typeof window.__queryClient !== 'undefined', { timeout: 10_000 })
  await page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (window as any).__queryClient.invalidateQueries({ queryKey: ['portfolio'] })
  })
}

/**
 * Authentifie le membre de seed, installe les mocks, navigue vers /portfolio,
 * puis déclenche le refetch client pour que les données mockées s'affichent.
 */
async function gotoPortfolio(page: Page): Promise<void> {
  // Les mocks doivent être installés AVANT le goto pour intercepter le refetch post-hydratation.
  await mockPortfolio(page)
  await loginAsSeedMember(page)
  await page.goto('/portfolio')
  // Le RSC rend initialData=null (seed sans positions) → EmptyState.
  // On déclenche le refetch client pour charger les données mockées.
  await triggerPortfolioRefetch(page)
}

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 1 : Chargement → donut + positions visibles
// ─────────────────────────────────────────────────────────────────────────────
test('chargement → donut + positions visibles', async ({ page }) => {
  await gotoPortfolio(page)

  // Le titre de la page est présent (h1 "Portefeuille", scopé sur le heading pour éviter
  // les doubles matches avec les liens de navigation).
  await expect(page.getByRole('heading', { name: 'Portefeuille' })).toBeVisible()

  // Le donut d'allocation est rendu (PieChart data-testid="allocation-donut").
  await expect(page.getByTestId('allocation-donut')).toBeVisible()

  // Les deux positions Technologie sont présentes (table desktop + cards DOM → .first() pour éviter strict-mode).
  await expect(page.getByText('META').first()).toBeVisible()
  await expect(page.getByText('NVIDIA').first()).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 2 : Filtre par secteur Santé → seules les positions Santé restent
// ─────────────────────────────────────────────────────────────────────────────
test('filtre par secteur Santé → seules les positions Santé restent', async ({ page }) => {
  await gotoPortfolio(page)

  // Attend que les positions soient rendues avant d'interagir.
  await expect(page.getByText('META').first()).toBeVisible()

  // Clic sur la pill "Santé" dans la FilterBar (bouton avec le nom du secteur).
  // Le AllocationDonut a un div absolute inset-0 pointer-events-none qui peut intercepter selon
  // le layout — on scrolle l'élément en vue avant de cliquer pour garantir l'interaction.
  const santeBtn = page.getByRole('button', { name: 'Santé' })
  await santeBtn.scrollIntoViewIfNeeded()
  await santeBtn.click()

  // Les positions Santé restent visibles (.first() : table desktop ou cards mobile).
  await expect(page.getByText('JOHNSON').first()).toBeVisible()
  await expect(page.getByText('PFIZER').first()).toBeVisible()

  // Les positions hors-Santé disparaissent entièrement du DOM (table + cards filtrées).
  await expect(page.getByText('META', { exact: true })).toHaveCount(0)
  await expect(page.getByText('NVIDIA', { exact: true })).toHaveCount(0)
  await expect(page.getByText('CATERPILLAR', { exact: true })).toHaveCount(0)
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 3 : Clic position → modale ; Escape ferme
// ─────────────────────────────────────────────────────────────────────────────
test('clic position → modale ; Escape ferme', async ({ page }) => {
  await gotoPortfolio(page)

  // Attend que la table soit rendue (viewport desktop → PortfolioTable).
  await expect(page.getByText('META').first()).toBeVisible()

  // Clic sur la première ligne (position-row). En tri "value" desc (par défaut), c'est NVIDIA.
  // On scrolle en vue avant de cliquer : le AllocationDonut au-dessus peut provoquer
  // une interception de pointeur selon le viewport/scroll.
  const rows = page.getByTestId('position-row')
  const firstRow = rows.first()
  await firstRow.scrollIntoViewIfNeeded()

  // Lit le nom de la première position pour asserter dans la modale.
  const firstRowLabel = await firstRow.getAttribute('aria-label')
  // aria-label = "Voir le détail de NVIDIA" → extrait le nom
  const positionName = firstRowLabel?.replace('Voir le détail de ', '') ?? 'NVIDIA'

  await firstRow.click()

  // La modale Radix Dialog est ouverte (role="dialog").
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // La modale affiche le nom de la position (Dialog.Title).
  await expect(dialog.getByText(positionName)).toBeVisible()

  // Escape ferme la modale.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 4 : Tri par performance change l'ordre des lignes
//
// Par défaut, le tri FilterBar est "value" (desc) → NVIDIA (506 577 €) en premier.
// Après sélection "performance" (desc) → la position avec le gain_loss_pct le plus
// élevé apparaît en premier. PFIZER a gain_loss_pct=-10 (perte) → en dernier en desc.
// On vérifie simplement que l'ordre change après la sélection.
// ─────────────────────────────────────────────────────────────────────────────
test("tri par performance change l'ordre des lignes", async ({ page }) => {
  await gotoPortfolio(page)

  // Attend que la table soit rendue.
  await expect(page.getByText('META').first()).toBeVisible()

  // Capture l'ordre initial des lignes (data-testid="position-row").
  const before = await page.getByTestId('position-row').allTextContents()

  // Change le tri via le select FilterBar (data-testid="sort-select").
  await page.getByTestId('sort-select').selectOption('performance')

  // L'ordre des lignes doit avoir changé.
  await expect
    .poll(async () => (await page.getByTestId('position-row').allTextContents()).join('|'), {
      timeout: 10_000,
    })
    .not.toBe(before.join('|'))
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 5 : Sans auth → redirect /login (middleware AUT-005)
// ─────────────────────────────────────────────────────────────────────────────
test('sans auth → redirect /login', async ({ page, context }) => {
  await context.clearCookies()
  await page.goto('/portfolio')
  await expect(page).toHaveURL(/\/login/)
})
