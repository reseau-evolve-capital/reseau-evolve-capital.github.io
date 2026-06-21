/**
 * Tests E2E — flux newsletter RÉSEAU « La Quote-Part » (EDI-007 / EDI-006).
 *
 * La newsletter est désormais pilotée par le BUREAU DU RÉSEAU (espace /reseau/newsletter),
 * plus par le staff d'un club. La garde de page est donc `is_network_member()` (middleware
 * /reseau) + le contexte réseau (RSC), et la garde API `/api/newsletter/*` est l'appartenance
 * réseau (cf. _guard.ts).
 *
 * Stratégie SANS Strapi ni Brevo réels :
 *   - Accès réseau : le seed (test@example.com) est `network_admin` (seed.sql) → membre réseau.
 *     On GARANTIT cette appartenance en beforeAll (INSERT ON CONFLICT, par EMAIL → robuste au
 *     re-key users.id au login), et on la restaure en afterAll. Aucune pollution des autres specs.
 *   - Le SSR de /reseau/newsletter lit la LISTE des éditions via Strapi côté serveur Next.
 *     `page.route` n'intercepte PAS le fetch serveur. Pour exercer le parcours complet, le
 *     serveur Next DOIT être lancé avec `NEXT_PUBLIC_STRAPI_API_URL` pointant vers un stub
 *     Strapi qui renvoie au moins une édition publiée (sinon la page tombe en état vide/erreur).
 *     Ce spec démarre ce stub (beforeAll, port E2E_STRAPI_STUB_PORT, défaut 4571) ; le lead
 *     câble l'env du webServer (cf. README QA). À défaut de liste, les étapes de parcours sont
 *     ignorées (test.skip) mais la garde de page + axe restent vérifiés.
 *   - Les routes NAVIGATEUR (/api/newsletter/preview|send-test|send) sont mockées via page.route
 *     (preview = HTML statique, send-test = OK, send = OK) : on teste les GARDES UI, pas Brevo.
 *
 * Réf : EDI-007 (case E e2e), block-contract.md, reseau-access.spec.ts (pattern network_members),
 *       CLAUDE.md (a11y AA, copy FR, jamais d'undefined).
 */

import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createServer, type Server } from 'node:http'
import postgres from 'postgres'

import { loginAsSeedMember, SEED_EMAIL } from './helpers'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const STUB_PORT = Number(process.env.E2E_STRAPI_STUB_PORT ?? '4571')

const EDITION = {
  slug: 'evitons-l-empressement',
  title: "Évitons l'empressement.",
  numeroEdition: 1,
  datePublication: '2026-06-15T08:00:00.000Z',
  excerpt: 'Deux trimestres calmes, une discipline de long terme.',
}

// ─── Stub Strapi (liste d'éditions pour le SSR) ──────────────────────────────
let stub: Server | null = null

function startStrapiStub(): Promise<void> {
  return new Promise((resolve) => {
    stub = createServer((req, res) => {
      // listNewsletters() → GET /api/articles?...&fields[...]&...
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ data: [EDITION] }))
    })
    stub.listen(STUB_PORT, () => resolve())
  })
}

function stopStrapiStub(): Promise<void> {
  return new Promise((resolve) => {
    if (!stub) return resolve()
    stub.close(() => resolve())
  })
}

// ─── Appartenance réseau (pattern reseau-access.spec.ts) ──────────────────────
// Le seed est `network_admin` par défaut (seed.sql) ; on garantit/restaure la ligne par EMAIL
// (robuste au re-key users.id au login) pour rendre ce spec hermétique quel que soit l'ordre.
async function ensureSeedNetworkMembership(): Promise<void> {
  const sql = postgres(DB_URL, { max: 1 })
  try {
    await sql`
      INSERT INTO network_members (user_id, role, title)
      SELECT id, 'network_admin'::network_role, 'president'::network_title
        FROM users
       WHERE email = ${SEED_EMAIL}
      ON CONFLICT (user_id) DO UPDATE
         SET role = 'network_admin'::network_role, title = 'president'::network_title
    `
  } finally {
    await sql.end()
  }
}

// ─── Mock des routes NAVIGATEUR /api/newsletter/* ────────────────────────────
async function mockNewsletterApi(page: Page): Promise<void> {
  await page.route('**/api/newsletter/preview**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><body><p>Aperçu newsletter (mock)</p></body></html>',
    })
  )
  await page.route('**/api/newsletter/send-test', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, recipients: 2 }),
    })
  )
  await page.route('**/api/newsletter/send', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, campaignId: 42, name: 'quote-part-n1' }),
    })
  )
}

/** True si la page a chargé une liste d'éditions (SSR Strapi câblé sur le stub). */
async function hasEditions(page: Page): Promise<boolean> {
  return page
    .getByLabel('Édition à envoyer')
    .isVisible()
    .catch(() => false)
}

test.beforeAll(async () => {
  await startStrapiStub()
  await ensureSeedNetworkMembership()
})

test.afterAll(async () => {
  await ensureSeedNetworkMembership()
  await stopStrapiStub()
})

test.beforeEach(async ({ page }) => {
  await mockNewsletterApi(page)
  await loginAsSeedMember(page)
})

// ─────────────────────────────────────────────────────────────────────────────
test('la page newsletter se monte (titre) — garde réseau OK', async ({ page }) => {
  await page.goto('/reseau/newsletter')
  await expect(page.getByRole('heading', { name: 'Newsletter' })).toBeVisible()
})

test('le bouton « Envoyer la campagne » est DÉSACTIVÉ tant que la case n’est pas cochée', async ({
  page,
}) => {
  await page.goto('/reseau/newsletter')
  test.skip(!(await hasEditions(page)), 'SSR Strapi non câblé (NEXT_PUBLIC_STRAPI_API_URL → stub).')

  const sendBtn = page.getByRole('button', { name: 'Envoyer la campagne' })
  await expect(sendBtn).toBeVisible()
  await expect(sendBtn).toBeDisabled()

  // Cocher la case déverrouille le bouton.
  await page.getByText("J'ai vérifié l'aperçu et l'email de test.").click()
  await expect(sendBtn).toBeEnabled()
})

test('parcours : aperçu → envoi test → cocher → envoyer (chaque étape OK)', async ({ page }) => {
  await page.goto('/reseau/newsletter')
  test.skip(!(await hasEditions(page)), 'SSR Strapi non câblé (NEXT_PUBLIC_STRAPI_API_URL → stub).')

  // 1) Aperçu : l'iframe pointe sur la route preview (mockée).
  const iframe = page.getByTitle('Aperçu de la newsletter')
  await expect(iframe).toBeVisible()

  // 2) Envoi d'un test → message de succès parlant (X destinataires).
  await page.getByRole('button', { name: 'Envoyer un test' }).click()
  await expect(page.getByText(/Test envoyé à 2 destinataire/)).toBeVisible()

  // 3) Cocher la confirmation → 4) envoyer la campagne → succès.
  await page.getByText("J'ai vérifié l'aperçu et l'email de test.").click()
  const sendBtn = page.getByRole('button', { name: 'Envoyer la campagne' })
  await expect(sendBtn).toBeEnabled()
  await sendBtn.click()
  await expect(page.getByText('Campagne envoyée à la liste des membres.')).toBeVisible()
})

test('a11y — aucune violation bloquante (axe wcag2a/aa)', async ({ page }) => {
  await page.goto('/reseau/newsletter')
  await expect(page.getByRole('heading', { name: 'Newsletter' })).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('nextjs-portal')
    .exclude('[data-nextjs-toast]')
    .exclude('.tsqd-parent-container')
    // L'iframe d'aperçu charge un document mock séparé — hors périmètre de cette page.
    .exclude('iframe')
    .analyze()

  const blocking = results.violations.filter((v) =>
    ['critical', 'serious'].includes(v.impact ?? '')
  )
  const summary = blocking.map((v) => `${v.id} (${v.impact}) × ${v.nodes.length} — ${v.help}`)
  expect(blocking, `Violations a11y bloquantes :\n${summary.join('\n')}`).toEqual([])
})
