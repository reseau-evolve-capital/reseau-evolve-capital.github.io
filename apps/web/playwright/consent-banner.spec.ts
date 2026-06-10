/**
 * Tests E2E — bannière de consentement RGPD + Consent Mode v2 (vérification « étape D »).
 *
 * Couvre le contrat de consentement, sur une route PUBLIQUE (/login → pas d'auth requise) :
 *  - la bannière s'affiche tant que le choix n'est pas tranché ;
 *  - AUCUN cookie GA (`_ga*`) n'est posé avant consentement ;
 *  - « Tout accepter » → Consent Mode `update {analytics_storage:'granted'}` + persistance
 *    (localStorage `evolve.consent.v1`) + la bannière ne réapparaît pas au reload ;
 *  - « Refuser » → `denied` + persistance ;
 *  - « Personnaliser » ouvre le panneau granulaire ; « Enregistrer » (analyse OFF) → `denied`.
 *
 * Déterminisme :
 *  - `test.use({ storageState: vierge })` : on OVERRIDE le state global (qui pré-résout le
 *    consentement pour les autres specs) afin de partir sans choix → la bannière s'affiche.
 *  - On stube `window.gtag` (addInitScript) pour observer les signaux Consent Mode v2 SANS GA
 *    réel : en e2e, NEXT_PUBLIC_GA_ID_APP est absent → gtag n'est pas chargé. Le stub pousse les
 *    appels dans `window.dataLayer`, qu'on inspecte ensuite.
 *
 * Réf : docs/analytics/, lib/consent/*, components/consent/ConsentMount.tsx.
 */

import { test, expect, type Page } from '@playwright/test'

// État vierge → aucun consentement → la bannière doit s'afficher.
test.use({ storageState: { cookies: [], origins: [] } })

test.beforeEach(async ({ page }) => {
  // Stub gtag : enregistre chaque appel dans dataLayer (observable depuis les tests).
  await page.addInitScript(() => {
    const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void }
    w.dataLayer = []
    w.gtag = (...args: unknown[]) => {
      w.dataLayer.push(args)
    }
  })
})

const DIALOG = { role: 'dialog' as const, name: 'Préférences de cookies' }

/** Retourne les appels `gtag('consent','update', …)` enregistrés dans le dataLayer. */
function consentUpdates(page: Page): Promise<unknown[]> {
  return page.evaluate(() => {
    const dl = (window as unknown as { dataLayer?: unknown[] }).dataLayer ?? []
    return dl.filter((e) => Array.isArray(e) && e[0] === 'consent' && e[1] === 'update')
  })
}

test('affiche la bannière et ne pose AUCUN cookie _ga avant choix', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole(DIALOG.role, { name: DIALOG.name })).toBeVisible()

  const cookies = await page.context().cookies()
  expect(cookies.some((c) => c.name.startsWith('_ga'))).toBe(false)
  // Aucun signal de consentement tant que l'utilisateur n'a pas cliqué.
  expect(await consentUpdates(page)).toHaveLength(0)
})

test('« Tout accepter » → granted + persistance + pas de réapparition au reload', async ({
  page,
}) => {
  await page.goto('/login')
  const banner = page.getByRole(DIALOG.role, { name: DIALOG.name })
  await banner.getByRole('button', { name: 'Tout accepter' }).click()
  await expect(banner).toBeHidden()

  const stored = await page.evaluate(() => localStorage.getItem('evolve.consent.v1'))
  expect(stored).toContain('"analytics":true')

  expect(await consentUpdates(page)).toContainEqual([
    'consent',
    'update',
    expect.objectContaining({ analytics_storage: 'granted' }),
  ])

  await page.reload()
  await expect(banner).toBeHidden()
})

test('« Refuser » → denied + persistance', async ({ page }) => {
  await page.goto('/login')
  const banner = page.getByRole(DIALOG.role, { name: DIALOG.name })
  await banner.getByRole('button', { name: 'Refuser' }).click()
  await expect(banner).toBeHidden()

  const stored = await page.evaluate(() => localStorage.getItem('evolve.consent.v1'))
  expect(stored).toContain('"analytics":false')

  expect(await consentUpdates(page)).toContainEqual([
    'consent',
    'update',
    expect.objectContaining({ analytics_storage: 'denied' }),
  ])
})

test('« Personnaliser » ouvre le panneau granulaire ; « Enregistrer » (analyse OFF) → denied', async ({
  page,
}) => {
  await page.goto('/login')
  const banner = page.getByRole(DIALOG.role, { name: DIALOG.name })
  await banner.getByRole('button', { name: 'Personnaliser mes choix' }).click()

  await expect(banner.getByText('Cookies nécessaires')).toBeVisible()
  await expect(banner.getByText("Cookies d'analyse")).toBeVisible()

  // Analyse OFF par défaut → Enregistrer = refus de la mesure d'audience.
  await banner.getByRole('button', { name: 'Enregistrer mes préférences' }).click()
  await expect(banner).toBeHidden()

  expect(await consentUpdates(page)).toContainEqual([
    'consent',
    'update',
    expect.objectContaining({ analytics_storage: 'denied' }),
  ])
})
