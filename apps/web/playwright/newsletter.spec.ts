/**
 * Tests E2E — flux admin newsletter « La Quote-Part » (EDI-007 / EDI-006).
 *
 * Stratégie SANS Strapi ni Brevo réels :
 *   - Login staff : on réutilise le pattern d'admin.spec.ts — le seed (test@example.com) est
 *     élevé temporairement au rôle 'treasurer' (beforeAll), restauré 'member' (afterAll).
 *     Identification par EMAIL (le login re-keye users.id). Aucune pollution des autres specs.
 *   - Le SSR de /admin/newsletter lit la LISTE des éditions via Strapi côté serveur Next.
 *     `page.route` n'intercepte PAS le fetch serveur. Pour exercer le parcours complet, le
 *     serveur Next DOIT être lancé avec `NEXT_PUBLIC_STRAPI_API_URL` pointant vers un stub
 *     Strapi qui renvoie au moins une édition publiée (sinon la page tombe en état vide/erreur).
 *     Ce spec démarre ce stub (beforeAll, port E2E_STRAPI_STUB_PORT, défaut 4571) ; le lead
 *     câble l'env du webServer (cf. README QA). À défaut de liste, les étapes de parcours sont
 *     ignorées (test.skip) mais la garde de page + axe restent vérifiés.
 *   - Les routes NAVIGATEUR (/api/newsletter/preview|send-test|send) sont mockées via page.route
 *     (preview = HTML statique, send-test = OK, send = OK) : on teste les GARDES UI, pas Brevo.
 *
 * Réf : EDI-007 (case E e2e), block-contract.md, CLAUDE.md (a11y AA, copy FR, jamais d'undefined).
 */

import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createServer, type Server } from 'node:http'
import postgres from 'postgres'

import { loginAsSeedMember, SEED_EMAIL } from './helpers'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const SEED_CLUB_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
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

// ─── Élévation de rôle (pattern admin.spec.ts) ───────────────────────────────
async function setSeedRole(role: 'member' | 'treasurer'): Promise<void> {
  const sql = postgres(DB_URL, { max: 1 })
  try {
    await sql`
      UPDATE memberships
         SET role = ${role}::member_role
       WHERE club_id = ${SEED_CLUB_ID}::uuid
         AND user_id IN (SELECT id FROM users WHERE email = ${SEED_EMAIL})
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
  await setSeedRole('treasurer')
})

test.afterAll(async () => {
  await setSeedRole('member')
  await stopStrapiStub()
})

test.beforeEach(async ({ page }) => {
  await mockNewsletterApi(page)
  await loginAsSeedMember(page)
})

// ─────────────────────────────────────────────────────────────────────────────
test('la page newsletter se monte (titre) — garde staff OK', async ({ page }) => {
  await page.goto('/admin/newsletter')
  await expect(page.getByRole('heading', { name: 'Newsletter' })).toBeVisible()
})

test('le bouton « Envoyer la campagne » est DÉSACTIVÉ tant que la case n’est pas cochée', async ({
  page,
}) => {
  await page.goto('/admin/newsletter')
  test.skip(!(await hasEditions(page)), 'SSR Strapi non câblé (NEXT_PUBLIC_STRAPI_API_URL → stub).')

  const sendBtn = page.getByRole('button', { name: 'Envoyer la campagne' })
  await expect(sendBtn).toBeVisible()
  await expect(sendBtn).toBeDisabled()

  // Cocher la case déverrouille le bouton.
  await page.getByText("J'ai vérifié l'aperçu et l'email de test.").click()
  await expect(sendBtn).toBeEnabled()
})

test('parcours : aperçu → envoi test → cocher → envoyer (chaque étape OK)', async ({ page }) => {
  await page.goto('/admin/newsletter')
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
  await page.goto('/admin/newsletter')
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
