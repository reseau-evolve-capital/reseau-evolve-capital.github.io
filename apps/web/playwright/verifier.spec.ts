/**
 * Tests E2E — page publique de vérification d'attestation (NTF-004, /verifier/[ref]).
 *
 * La page est PUBLIQUE (hors (app), pas d'auth) : la RPC `verify_attestation` est
 * SECURITY DEFINER + GRANT anon → un client anon suffit, divulgation minimale.
 *
 * Scénarios :
 *   1. Référence inconnue → état neutre « Référence inconnue… » + note d'aide (jamais brand.red).
 *   2. Référence connue (seedée dans attestation_sends) → badge « Document authentique » + club.
 *
 * Le seeding insère une ligne attestation_sends avec `reference` sur l'adhésion du membre
 * de seed (résolue par EMAIL, robuste au re-key). Nettoyage en afterAll.
 *
 * Réf : NTF-004, migration 023, CLAUDE.md (RLS, copy FR, AA).
 */

import { test, expect } from '@playwright/test'
import postgres from 'postgres'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const SEED_EMAIL = 'test@example.com'
const KNOWN_REF = 'REC-202604-E2EV'
const KNOWN_PERIOD = '2026-04'

async function withDb<T>(fn: (sql: ReturnType<typeof postgres>) => Promise<T>): Promise<T> {
  const sql = postgres(DB_URL, { max: 1 })
  try {
    return await fn(sql)
  } finally {
    await sql.end()
  }
}

test.beforeAll(async () => {
  await withDb(async (sql) => {
    await sql`
      INSERT INTO attestation_sends (membership_id, period, reference, sent_at)
      SELECT m.id, ${KNOWN_PERIOD}, ${KNOWN_REF}, '2026-05-05T06:00:00Z'
      FROM memberships m
      JOIN users u ON u.id = m.user_id
      WHERE u.email = ${SEED_EMAIL}
      LIMIT 1
      ON CONFLICT (membership_id, period) DO UPDATE SET reference = EXCLUDED.reference
    `
  })
})

test.afterAll(async () => {
  await withDb(async (sql) => {
    await sql`DELETE FROM attestation_sends WHERE reference = ${KNOWN_REF}`
  })
})

test('référence inconnue → état neutre (sans rouge brand)', async ({ page }) => {
  await page.goto('/verifier/REC-000000-ZZZZ')

  await expect(page.getByText(/Référence inconnue/i)).toBeVisible()
  await expect(page.getByText(/vérifiables après leur envoi mensuel/i)).toBeVisible()
  // La référence demandée reste affichée (traçabilité).
  await expect(page.getByText('REC-000000-ZZZZ')).toBeVisible()
})

test('référence connue → document authentique + club', async ({ page }) => {
  await page.goto(`/verifier/${KNOWN_REF}`)

  await expect(page.getByText(/Document authentique/i)).toBeVisible()
  await expect(page.getByText(KNOWN_REF)).toBeVisible()
  // Le club du membre de seed (« Club E2E ») est divulgué (pas de PII membre).
  await expect(page.getByText(/Club/i).first()).toBeVisible()
})
