/**
 * Tests E2E — logo de marque CLAIR au rendu, partout (anti-régression « PWA claire /
 * navigateur ancien »).
 *
 * Incident (juin 2026) : la migration vers le logo clair (tuile crème) n'avait touché que
 * le chrome authentifié + les assets PWA. Login / onboarding / pages légales / vérification
 * affichaient encore l'ancien `/logo.jpg` (fond noir). La PWA démarrant sur `/dashboard`
 * (clair) mais l'entrée navigateur étant `/login`, l'utilisateur voyait deux logos différents.
 *
 * Cette spec vérifie AU RENDU que, sur les routes listées, l'image affichée par l'atome `Logo`
 * pointe bien l'icône claire `/icons/icon-192.png` et qu'AUCUNE `<img>` de la page ne pointe
 * l'ancien `/logo.jpg`. Le verrou statique (scan du code) vit dans `lib/brand.test.ts` ; cette
 * spec double la garantie côté DOM rendu.
 *
 * L'atome Logo rend `<img alt="" aria-hidden="true" class="…rounded…">` DANS un conteneur
 * `span[role="img"][aria-label="Evolve Capital"]` — on sélectionne via ce conteneur.
 *
 * Routes :
 *   - PUBLIQUES : /login, /legal/charter, /legal/privacy (aucune auth requise) ;
 *   - AUTHENTIFIÉE : /dashboard (via loginAsSeedMember, même pattern que les autres specs).
 *
 * Exécution sérielle (workers:1), env local Supabase (service role requis pour le login seed).
 *
 * Réf : apps/web/lib/brand.ts (BRAND_LOGO_SRC), helpers.ts (auth seed), input-min-fontsize.spec.ts.
 */

import { test, expect, type Page } from '@playwright/test'

import { loginAsSeedMember } from './helpers'

const BRAND_LOGO_SRC = '/icons/icon-192.png'
const LEGACY_LOGO = '/logo.jpg'

// Conteneur de l'atome Logo (cf. packages/ui/src/atoms/Logo/Logo.tsx).
const LOGO_CONTAINER = 'span[role="img"][aria-label="Evolve Capital"]'

/**
 * Vérifie sur la page courante : (1) au moins une image de logo de marque, (2) toutes ces
 * images pointent l'icône claire, (3) aucune `<img>` de la page ne pointe l'ancien logo.
 */
async function assertBrandLogo(page: Page, route: string): Promise<void> {
  // 1+2 — toutes les images rendues par l'atome Logo pointent l'icône claire.
  const logoImgs = page.locator(`${LOGO_CONTAINER} img`)
  const count = await logoImgs.count()
  expect(count, `${route} : au moins une image de logo de marque attendue`).toBeGreaterThan(0)

  for (let i = 0; i < count; i++) {
    const src = await logoImgs.nth(i).getAttribute('src')
    expect(src, `${route} : src du logo #${i} manquant`).not.toBeNull()
    // En Next.js, le `src` peut être réécrit (optimizer) — on vérifie l'inclusion du chemin
    // canonique, jamais une égalité stricte fragile.
    expect(
      src,
      `${route} : logo #${i} doit pointer l'icône claire (${BRAND_LOGO_SRC}), reçu ${src}`
    ).toContain(BRAND_LOGO_SRC)
    expect(src, `${route} : logo #${i} ne doit PAS pointer l'ancien ${LEGACY_LOGO}`).not.toContain(
      LEGACY_LOGO
    )
  }

  // 3 — aucune <img> de la PAGE entière ne pointe l'ancien logo (filet large).
  const legacy = await page
    .locator('img')
    .evaluateAll(
      (imgs, legacy) =>
        imgs
          .map((img) => (img as HTMLImageElement).getAttribute('src') ?? '')
          .filter((src) => src.includes(legacy)),
      LEGACY_LOGO
    )
  expect(
    legacy,
    `${route} : des <img> pointent encore ${LEGACY_LOGO} :\n${legacy.join('\n')}`
  ).toEqual([])
}

test.describe.configure({ mode: 'serial' })

test.describe('logo de marque clair au rendu — routes publiques', () => {
  for (const route of ['/login', '/legal/charter', '/legal/privacy']) {
    test(`${route} affiche le logo clair (pas /logo.jpg)`, async ({ page }) => {
      await page.goto(route)
      await page.locator(LOGO_CONTAINER).first().waitFor({ state: 'visible', timeout: 15_000 })
      await assertBrandLogo(page, route)
    })
  }
})

test.describe('logo de marque clair au rendu — route authentifiée', () => {
  test('/dashboard (chrome app) affiche le logo clair', async ({ page }) => {
    await loginAsSeedMember(page)
    await page.locator(LOGO_CONTAINER).first().waitFor({ state: 'visible', timeout: 15_000 })
    await assertBrandLogo(page, '/dashboard')
  })
})
