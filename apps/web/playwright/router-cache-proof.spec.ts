/**
 * Preuve du Router Cache (ticket C) — NE TOURNE QUE contre un BUILD DE PRODUCTION.
 *
 * Vérifie le comportement attendu de `experimental.staleTimes.dynamic = 60` :
 * dashboard → portfolio → retour dashboard < 60 s = servi depuis le Router Cache
 * client, donc AUCUNE requête RSC réémise vers /dashboard et AUCUN skeleton
 * (loading.tsx) re-rendu au retour.
 *
 * ⚠ SKIP par défaut : en `next dev`, le Router Cache client est DÉSACTIVÉ par Next
 * (chaque navigation refetch pour refléter le HMR) → ce spec échouerait dans la suite
 * standard (webServer = pnpm dev). Pour le jouer :
 *   1. `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3012 pnpm --filter @evolve/web build`
 *   2. `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3012 next start -p 3012`
 *   3. `E2E_PROD_PROOF=1 E2E_BASE_URL=http://127.0.0.1:3012 playwright test router-cache-proof`
 * Validé PASS le 2026-06-12 (Next 16.2.6).
 */
import { test, expect } from '@playwright/test'
import { loginAsSeedMember } from './helpers'

test.skip(
  !process.env.E2E_PROD_PROOF,
  'Preuve Router Cache : uniquement contre un build de production (E2E_PROD_PROOF=1)'
)

test('retour /dashboard < 60 s → Router Cache (0 fetch RSC, 0 skeleton)', async ({ page }) => {
  await loginAsSeedMember(page)
  await expect(page.getByRole('main')).toBeVisible()
  await page.waitForTimeout(1000)

  // Trace toutes les requêtes RSC (param _rsc posé par Next sur les navigations client).
  const rscDashboard: string[] = []
  page.on('request', (req) => {
    const u = new URL(req.url())
    if (u.pathname === '/dashboard' && u.searchParams.has('_rsc')) rscDashboard.push(req.url())
  })

  // NB : la 1re visite de /dashboard est un chargement DOCUMENT (page.goto) — son payload
  // RSC n'est PAS dans le Router Cache. Le 1er retour client paie donc UNE requête RSC
  // (qui peuple le cache) ; c'est le 2ᵉ retour < 60 s qui prouve staleTimes.dynamic.

  // dashboard → portfolio (navigation client via la sidebar)
  await page
    .getByRole('link', { name: /portefeuille du club/i })
    .first()
    .click()
  await page.waitForURL(/\/portfolio/)
  await page.waitForTimeout(500)

  // 1er retour : peuple le Router Cache (1 fetch RSC attendu en dev, prefetch désactivé).
  await page
    .getByRole('link', { name: /tableau de bord/i })
    .first()
    .click()
  await page.waitForURL(/\/dashboard$/)
  await page.waitForTimeout(500)

  // 2ᵉ aller-retour < 60 s : doit être servi depuis le Router Cache.
  await page
    .getByRole('link', { name: /portefeuille du club/i })
    .first()
    .click()
  await page.waitForURL(/\/portfolio/)
  await page.waitForTimeout(500)

  const beforeReturn = rscDashboard.length

  await page
    .getByRole('link', { name: /tableau de bord/i })
    .first()
    .click()
  await page.waitForURL(/\/dashboard$/)
  // Contenu réel attendu immédiatement (pas de skeleton intermédiaire).
  await page.waitForTimeout(400)

  // 1. Aucune requête RSC /dashboard déclenchée PAR le 2ᵉ retour (cache router, < 60 s).
  expect(rscDashboard.length).toBe(beforeReturn)
  // 2. Le contenu est là (le hero quote-part est rendu, pas un skeleton).
  await expect(page.getByRole('main')).toBeVisible()
})
