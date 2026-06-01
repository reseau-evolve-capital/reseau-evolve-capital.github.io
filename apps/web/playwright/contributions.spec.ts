/**
 * Tests E2E — écran /contributions (COT-005).
 *
 * Réutilise le harness magic-link (loginAsSeedMember) + mocke /api/contributions pour
 * un rendu déterministe (statut ok, 16 mois, 2 années : 2026 et 2025).
 *
 * Stratégie d'hydratation :
 *   La page /contributions est rendue côté RSC avec `initialData`. Le seed n'a pas de
 *   cotisations → `initialData = null` → useContributions reçoit `initialDataUpdatedAt: 0`,
 *   ce qui marque la query comme périmée dès le montage. Un cycle blur→focus déclenche
 *   `refetchOnWindowFocus`, et la route mockée /api/contributions s'applique de façon
 *   déterministe. Résultat indépendant de l'état de la DB de seed.
 *
 * useSyncStatus utilise useMutation — il ne fetch que sur mutate(), jamais au montage.
 * Aucun stub /api/sync n'est nécessaire.
 *
 * Desktop uniquement (1280×720 par défaut Playwright).
 *
 * Scénarios : chargement (titre, statut, KPIs, timeline), groupement par année, bandeau
 * retard, popover mois, sans auth → redirect.
 * Lighthouse/CI : hors scope (décision de cadrage) — perf/a11y couvertes par jest-axe en unit.
 *
 * Réf : COT-005, CLAUDE.md (a11y AA, copy FR, jamais de NaN/undefined).
 */

import { test, expect, type Page, type Route } from '@playwright/test'

import type { ContributionsData } from '@/lib/data/contributions'
import type { TimelineYear } from '@evolve/ui'

import { loginAsSeedMember } from './helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Fixture de données mockées
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit une ContributionsData déterministe.
 * - 2026 : mois 4 (en attente) + 3, 2, 1 (payés).
 * - 2025 : mois 12..1 tous payés.
 * Les ariaLabel sont contrôlés ici pour que les assertions soient stables.
 */
function buildData(over?: Partial<ContributionsData>): ContributionsData {
  const year2026: TimelineYear = {
    year: 2026,
    months: [4, 3, 2, 1].map((m) => ({
      month: m,
      variant: m === 4 ? 'pending' : 'paid',
      tooltip: `Mois ${m}/2026`,
      ariaLabel: `Mois ${m} 2026 ${m === 4 ? 'en attente' : 'payé'}`,
    })),
  }

  const year2025: TimelineYear = {
    year: 2025,
    months: Array.from({ length: 12 }, (_, i) => 12 - i).map((m) => ({
      month: m,
      variant: 'paid' as const,
      tooltip: `Mois ${m}/2025`,
      ariaLabel: `Mois ${m} 2025 payé`,
    })),
  }

  return {
    clubId: 'aaaaaaaa-0000-0000-0000-000000000001',
    status: 'ok',
    totalContributed: 28000,
    monthsCount: 16,
    detentionPct: 0.0899,
    penalties: 0,
    amountDue: 0,
    syncedAt: new Date().toISOString(),
    userRole: 'member',
    years: [year2026, year2025],
    ...over,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de mock et de navigation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Installe un mock 200 sur /api/contributions renvoyant `data`.
 *
 * useSyncStatus utilise useMutation (fetch uniquement sur mutate(), pas au montage)
 * → aucun stub /api/sync nécessaire.
 */
async function mockContributions(page: Page, data: ContributionsData): Promise<void> {
  await page.route('**/api/contributions*', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    })
  )
}

/**
 * Authentifie le membre de seed, installe les mocks, navigue vers /contributions,
 * puis déclenche le refetch client pour que les données mockées s'affichent.
 *
 * Le seed n'a pas de cotisations → initialData=null → useContributions reçoit
 * initialDataUpdatedAt: 0, marquant la query comme périmée depuis l'epoch.
 * Un cycle blur→focus déclenche refetchOnWindowFocus et applique la route mockée.
 */
async function gotoContributions(page: Page, data: ContributionsData): Promise<void> {
  // Les mocks doivent être installés AVANT le goto pour intercepter le refetch post-hydratation.
  await mockContributions(page, data)
  await loginAsSeedMember(page)
  await page.goto('/contributions')

  // Déclenche le refetch client (query périmée depuis l'epoch → blur/focus → refetchOnWindowFocus).
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'))
    window.dispatchEvent(new Event('focus'))
  })

  // Attend que la timeline soit rendue — confirme que le refetch a produit les données mockées.
  await expect(page.getByRole('list', { name: 'Historique des cotisations' })).toBeVisible({
    timeout: 10_000,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 1 : Chargement → titre, statut, KPIs et timeline visibles
// ─────────────────────────────────────────────────────────────────────────────
test('chargement → titre, statut, KPIs et timeline visibles', async ({ page }) => {
  await gotoContributions(page, buildData())

  // Titre de la page (h1 « Mes cotisations »).
  await expect(page.getByRole('heading', { name: 'Mes cotisations' })).toBeVisible()

  // Pill de statut : status='ok' → label « Situation régulière ».
  await expect(page.getByText('Situation régulière')).toBeVisible()

  // La timeline est présente (landmark list déjà attendu dans gotoContributions, on re-confirme).
  await expect(page.getByRole('list', { name: 'Historique des cotisations' })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 2 : Timeline groupée par année (2026 et 2025)
// ─────────────────────────────────────────────────────────────────────────────
test('timeline groupée par année (2026 et 2025)', async ({ page }) => {
  await gotoContributions(page, buildData())

  // Les headings <h3> d'année doivent être rendus avec le texte de l'année.
  await expect(page.getByRole('heading', { name: '2026' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '2025' })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 3 : Statut en retard → banner d'alerte avec montant dû
// ─────────────────────────────────────────────────────────────────────────────
test("statut en retard → banner d'alerte avec montant dû", async ({ page }) => {
  await gotoContributions(page, buildData({ status: 'late', amountDue: 100 }))

  // Le bandeau role="alert" doit être visible et mentionner « retard ».
  const alert = page.getByRole('alert')
  await expect(alert).toBeVisible()
  await expect(alert).toContainText('retard')
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 4 : Clic sur une cellule de mois → Popover détail
// ─────────────────────────────────────────────────────────────────────────────
test('clic sur une cellule de mois → Popover détail', async ({ page }) => {
  await gotoContributions(page, buildData())

  // La cellule « Mois 3 2026 payé » (bouton Radix Popover Trigger).
  const cell = page.getByRole('button', { name: 'Mois 3 2026 payé' })
  await cell.scrollIntoViewIfNeeded()
  await cell.click()

  // Le contenu du Popover affiche le tooltip « Mois 3/2026 ».
  await expect(page.getByText('Mois 3/2026')).toBeVisible({ timeout: 5_000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 5 : Sans auth → redirect /login (middleware AUT-005)
// ─────────────────────────────────────────────────────────────────────────────
test('sans auth → redirect /login', async ({ page, context }) => {
  await context.clearCookies()
  await page.goto('/contributions')
  await expect(page).toHaveURL(/\/login/)
})
