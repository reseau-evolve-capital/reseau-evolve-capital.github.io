/**
 * Tests E2E — attestation de détention (NTF-004).
 *
 * Stratégie (alignée sur contributions.spec.ts) : seeding DB chirurgical local. Le membre de
 * seed possède DÉJÀ une ligne `contributions` (global-setup) → le DTO est non-vide. On télécharge
 * via l'API authentifiée (cookies posés par loginAsSeedMember) et on asserte sur la réponse PDF.
 *
 * Scénarios :
 *   1. Un membre télécharge SON attestation → 200, content-type application/pdf, filename, body %PDF.
 *   2. Un membre ne peut pas exporter l'attestation d'un AUTRE club (clubId tiers) → 403/404.
 *   3. Sans auth → 401.
 *
 * NB : on exerce l'API directement (request context partageant les cookies de la page) — le PDF
 * binaire est plus robuste à asserter qu'un download piloté navigateur, et la chaîne RSC→fetch
 * du CTA est couverte par les tests unitaires + le typecheck de ContributionsView.
 *
 * Réf : NTF-004, CLAUDE.md (RLS, jamais de NaN/undefined, copy FR).
 */

import { test, expect } from '@playwright/test'
import postgres from 'postgres'

import { loginAsSeedMember } from './helpers'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const SEED_CLUB_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
// Club tiers (le membre de seed n'y a AUCUNE adhésion) → l'export doit être refusé.
const OTHER_CLUB_ID = 'cccccccc-0000-0000-0000-000000000099'

async function withDb<T>(fn: (sql: ReturnType<typeof postgres>) => Promise<T>): Promise<T> {
  const sql = postgres(DB_URL, { max: 1 })
  try {
    return await fn(sql)
  } finally {
    await sql.end()
  }
}

/** Seede une position active sur le club de seed → la valo portefeuille est non-`—`. */
async function seedPosition(): Promise<void> {
  await withDb(async (sql) => {
    await sql`
      INSERT INTO positions (club_id, name, symbol, quantity, market_value, is_active, synced_at)
      VALUES (${SEED_CLUB_ID}::uuid, 'META PLATFORMS', 'NASDAQ:META', 10, 5000, true, NOW())
      ON CONFLICT (club_id, symbol) DO UPDATE
        SET quantity = EXCLUDED.quantity, market_value = EXCLUDED.market_value,
            is_active = true, synced_at = NOW()
    `
  })
}

async function cleanupPosition(): Promise<void> {
  await withDb(async (sql) => {
    await sql`DELETE FROM positions WHERE club_id = ${SEED_CLUB_ID}::uuid AND symbol = 'NASDAQ:META'`
  })
}

test.beforeAll(async () => {
  await seedPosition()
})

test.afterAll(async () => {
  await cleanupPosition()
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 1 : le membre télécharge SON attestation → PDF
// ─────────────────────────────────────────────────────────────────────────────
test('un membre télécharge son attestation → PDF (200, content-type, filename)', async ({
  page,
}) => {
  await loginAsSeedMember(page)

  const res = await page.request.get(
    `/api/attestation/detention?clubId=${SEED_CLUB_ID}&period=2026-06`
  )
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('application/pdf')
  // H1 (QA 2026-06-07) : ouverture inline (viewer navigateur) plutôt que download forcé.
  expect(res.headers()['content-disposition']).toMatch(/inline; filename=".*\.pdf"/)
  expect(res.headers()['content-disposition']).toContain('2026-06')

  const body = await res.body()
  expect(body.length).toBeGreaterThan(1000)
  expect(body.subarray(0, 5).toString('ascii')).toBe('%PDF-')
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 2 : pas membre du club demandé → refus (403/404)
// ─────────────────────────────────────────────────────────────────────────────
test("un membre ne peut pas exporter l'attestation d'un autre club → 403/404", async ({ page }) => {
  await loginAsSeedMember(page)

  const res = await page.request.get(`/api/attestation/detention?clubId=${OTHER_CLUB_ID}`)
  expect([403, 404]).toContain(res.status())
  expect(res.headers()['content-type']).not.toContain('application/pdf')
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 3 : sans auth → 401
// ─────────────────────────────────────────────────────────────────────────────
test('sans auth → 401', async ({ page, context }) => {
  await context.clearCookies()
  const res = await page.request.get(`/api/attestation/detention?clubId=${SEED_CLUB_ID}`)
  expect(res.status()).toBe(401)
})
