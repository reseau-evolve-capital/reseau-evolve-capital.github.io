/**
 * Tests E2E — Feedback Widget (LOT D, spec §7).
 *
 * Réutilise le harness magic-link (loginAsSeedMember) qui pose la page sur /dashboard.
 * On ouvre le widget via l'icône topbar (aria-label « Retour », FR par défaut), on choisit
 * un type, on remplit le message, on envoie, et on asserte l'état succès (« Merci pour ton
 * retour. »).
 *
 * INSERT RÉEL sous la session du membre seed : la policy RLS « feedback: self insert »
 * (migration 036) autorise user_id = auth.uid(). Le trigger PG feedback_dispatch est NO-OP
 * en local (Vault non peuplé → CROSS JOIN vide), donc l'insert seul suffit — pas de capture
 * dans ce flow. On nettoie les retours du membre seed avant/après pour l'idempotence.
 *
 * Réf : feedback widget spec, helpers.ts (auth), CLAUDE.md (a11y AA, copy FR).
 */

import { test, expect } from '@playwright/test'
import postgres from 'postgres'

import { loginAsSeedMember } from './helpers'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const TEST_EMAIL = 'test@example.com'

/** Purge les retours du membre seed (idempotence inter-run). Best-effort. */
async function clearFeedback(): Promise<void> {
  const sql = postgres(DB_URL, { max: 1 })
  try {
    await sql`DELETE FROM public.feedback WHERE user_email = ${TEST_EMAIL}`
  } catch {
    // La table peut ne pas exister sur une DB locale sans migration 036 — non bloquant ici.
  } finally {
    await sql.end()
  }
}

test.beforeAll(clearFeedback)
test.afterAll(clearFeedback)

test('le membre envoie un retour et voit l’écran de succès', async ({ page }) => {
  await loginAsSeedMember(page)

  // Ouvre le widget via l'icône topbar (aria-label « Retour » en FR).
  await page.getByRole('button', { name: 'Retour', exact: true }).click()

  // Le sheet (dialog) s'ouvre avec le titre.
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Un retour à partager ?')).toBeVisible()

  // Sélectionne le type « Bug ».
  await dialog.getByRole('button', { name: 'Bug', exact: true }).click()

  // Remplit le message.
  await dialog.getByLabel('Ton message').fill('Le bouton de connexion ne répond pas sur mobile.')

  // Envoie.
  await dialog.getByRole('button', { name: 'Envoyer →' }).click()

  // État succès.
  await expect(page.getByText('Merci pour ton retour.')).toBeVisible({ timeout: 15_000 })
})
