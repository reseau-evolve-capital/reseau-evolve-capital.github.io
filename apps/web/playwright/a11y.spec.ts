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

import { loginAsSeedMember } from './helpers'

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
  test.beforeEach(async ({ page }) => {
    await loginAsSeedMember(page)
  })

  test('/dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('button', { name: /Ta quote-part/i })).toBeVisible()
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
