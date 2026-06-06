/**
 * i18n.spec.ts — Bascule de locale (I18N-001).
 *
 * Prouve la chaîne complète next-intl « without i18n routing » :
 *   - locale par défaut = FR (aucun cookie) → rendu identique à aujourd'hui ;
 *   - cookie `NEXT_LOCALE=en` → catalogue EN servi + `<html lang="en">`.
 *
 * On cible la page 404 (Server Component + getTranslations) : aucun auth requis,
 * elle exerce le root layout (locale → `<html lang>`) et un composant traduit.
 */
import { test, expect } from '@playwright/test'

const NOT_FOUND_PATH = '/zzz-i18n-bascule-locale'

test.describe('i18n — bascule de locale (cookie NEXT_LOCALE)', () => {
  test('FR par défaut (sans cookie) : rendu français + lang=fr', async ({ page }) => {
    await page.goto(NOT_FOUND_PATH)
    await expect(page.getByText('Page introuvable')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Retour au tableau de bord' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  })

  test('EN via cookie : catalogue anglais + lang=en', async ({ page, context }) => {
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(NOT_FOUND_PATH)
    await expect(page.getByText('Page not found')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to dashboard' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })
})
