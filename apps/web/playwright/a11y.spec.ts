/**
 * Tests d'accessibilité automatisés — axe-core (FIX-A11Y-001).
 *
 * Couvre les écrans clés (publics + authentifiés) et échoue sur toute violation
 * WCAG 2 A/AA d'impact `critical` ou `serious`. Lève les angles morts laissés par
 * l'audit manuel (ordre de tab, contraste, noms accessibles).
 *
 * Les overlays de DÉVELOPPEMENT (Next DevTools `<nextjs-portal>`, React-Query
 * devtools) sont exclus : absents en production, hors périmètre produit.
 *
 * Réf : AUDIT-2026-06-02 §FIX-A11Y-001, CLAUDE.md (a11y AA mini, AAA chiffres-clés).
 */
import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import postgres from 'postgres'

import { loginAsSeedMember } from './helpers'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const SEED_CLUB_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

const BLOCKING = new Set(['critical', 'serious'])

async function expectNoSeriousA11yViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Overlays dev-only — absents en prod.
    .exclude('nextjs-portal')
    .exclude('[data-nextjs-toast]')
    .exclude('.tsqd-parent-container')
    .exclude('[aria-label*="Tanstack" i]')
    .analyze()

  const blocking = results.violations.filter((v) => BLOCKING.has(v.impact ?? ''))
  const summary = blocking.map((v) => `${v.id} (${v.impact}) × ${v.nodes.length} — ${v.help}`)
  expect(blocking, `Violations a11y bloquantes sur ${label} :\n${summary.join('\n')}`).toEqual([])
}

test.describe('A11y — écrans publics', () => {
  test('/login (split-panel)', async ({ page }) => {
    // Viewport desktop assez haut pour que les stats du panneau marque (bas du split)
    // soient rendues à l'écran : sinon, clippées au fold, axe ne résout pas leur fond
    // sombre et les flague à tort sur fond blanc (faux positif color-contrast).
    await page.setViewportSize({ width: 1280, height: 1000 })
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Bienvenue.' })).toBeVisible()
    await expectNoSeriousA11yViolations(page, '/login')
  })

  test('404 — page introuvable FR', async ({ page }) => {
    await page.goto('/zzz-a11y-introuvable')
    await expect(page.getByText('Page introuvable')).toBeVisible()
    await expectNoSeriousA11yViolations(page, '404')
  })
})

test.describe('A11y — écrans authentifiés', () => {
  // Prérequis : le test /portfolio audite la vue PEUPLÉE (h1 « Portefeuille » — l'état
  // vide rend un h2 différent). On garantit la premise en upsertant les 3 positions de
  // démo du GUIDE_DEV_LOCAL §6 (pattern « seeding local par spec », cf. admin.spec.ts).
  test.beforeAll(async () => {
    const sql = postgres(DB_URL, { max: 1 })
    try {
      await sql`
        INSERT INTO positions (club_id, name, symbol, category, sector, quantity, currency,
                               market_value, book_value, allocation_pct, pump, gain_loss_pct,
                               gain_loss_eur, is_active, synced_at)
        VALUES
          (${SEED_CLUB_ID}::uuid, 'META PLATFORMS', 'NASDAQ:META', 'Actions', 'Technologie', 248, 'EUR',
            145050, 113216, 33.5, 456.5, 28.1, 31834, true, NOW()),
          (${SEED_CLUB_ID}::uuid, 'NVIDIA', 'NASDAQ:NVDA', 'Actions', 'Technologie', 2957, 'EUR',
            506577, 125586, 50.2, 42.5, 303.4, 380991, true, NOW()),
          (${SEED_CLUB_ID}::uuid, 'JOHNSON & JOHNSON', 'NYSE:JNJ', 'Actions', 'Santé', 120, 'EUR',
            18000, 16500, 12.1, 137.5, 9.1, 1500, true, NOW())
        ON CONFLICT (club_id, symbol) DO NOTHING
      `
    } finally {
      await sql.end()
    }
  })

  test.beforeEach(async ({ page }) => {
    await loginAsSeedMember(page)
  })

  test('/dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    // Défaut = V2 depuis le rollout 100 % (2026-06-12) : le hero desktop n'est plus un
    // bouton « Ta quote-part » → ancrage sur le toggle de périodes du bloc Évolution
    // (getByRole ne matche que l'instance visible de la double instance responsive).
    await expect(page.getByRole('group', { name: 'Période' })).toBeVisible()
    await expectNoSeriousA11yViolations(page, '/dashboard')
  })

  test('/portfolio', async ({ page }) => {
    await page.goto('/portfolio')
    await expect(page.getByRole('heading', { name: 'Portefeuille' })).toBeVisible()
    await expectNoSeriousA11yViolations(page, '/portfolio')
  })

  test('/contributions', async ({ page }) => {
    await page.goto('/contributions')
    await expect(page.getByRole('heading', { name: 'Mes cotisations' })).toBeVisible()
    await expectNoSeriousA11yViolations(page, '/contributions')
  })
})
