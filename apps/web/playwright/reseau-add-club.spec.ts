/**
 * Tests E2E — Assistant « Ajouter un club » (NET-006), 3 étapes.
 *
 * Le membre de seed (test@example.com) est `network_admin` (NET-001, seed.sql) → il peut créer un
 * club. Flow couvert (sans SQL ni terminal côté utilisateur) :
 *   1. Infos    → saisie + « Continuer » (crée le club).
 *   2. Matrice  → ID 'notshared' → test KO (not_shared) → « Continuer » DÉSACTIVÉ ;
 *                 corrige avec un ID OK → test OK (succès) → « Continuer » ACTIF → branche la matrice.
 *   3. Import   → lance l'import (sync mockée → SyncBanner « 18 membres importés ») → désigne un
 *                 responsable (membre seedé dans le club créé) → « Terminer ».
 *
 * SEAM de mock e2e — IMPÉRATIF : la Server Action `probeSheet` / `triggerInitialSync` renvoie des
 * réponses canoniques DÉTERMINISTES SEULEMENT quand `E2E_NETWORK_MOCKS=1` est posé sur le process
 * du dev server (jamais en prod). Lancer ce spec avec ce flag :
 *   E2E_NETWORK_MOCKS=1 pnpm --filter @evolve/web exec playwright test reseau-add-club.spec.ts
 * ⚠️ `reuseExistingServer` : si un dev server tourne SANS le flag, playwright le réutilise et le
 * mock est inactif → couper le dev server avant, ou lancer avec le flag.
 *
 * `triggerInitialSync` mockée ne crée AUCUN membre en DB : on seede donc 1 membre dans le club
 * fraîchement créé (lookup par slug, clé stable) AVANT de lancer l'import, pour peupler le select
 * du responsable. Nettoyage : suppression des clubs créés par le test en afterAll (par slug).
 *
 * Réf : reseau-access.spec.ts (seed network_admin réversible), helpers.ts (login), NET-006.
 */

import { test, expect, type Page } from '@playwright/test'
import postgres from 'postgres'

import { loginAsSeedMember } from './helpers'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

// Slug unique par run (évite la collision unique_violation si un run précédent a laissé un club).
const RUN = Date.now().toString(36)
const CLUB_SLUG = `e2e-add-${RUN}`
const CLUB_NAME = `Club Test ${RUN}`
const MEMBER_EMAIL = `responsable-${RUN}@e2e.test`
const MEMBER_NAME = 'RESPONSABLE Test'

async function withDb<T>(fn: (sql: ReturnType<typeof postgres>) => Promise<T>): Promise<T> {
  const sql = postgres(DB_URL, { max: 1 })
  try {
    return await fn(sql)
  } finally {
    await sql.end()
  }
}

/** Seede 1 membre actif dans le club créé (lookup par slug) → peuple le select du responsable. */
async function seedMemberInCreatedClub(): Promise<void> {
  await withDb(async (sql) => {
    const [club] = await sql<{ id: string }[]>`SELECT id FROM clubs WHERE slug = ${CLUB_SLUG}`
    if (!club) throw new Error(`club ${CLUB_SLUG} introuvable (création KO ?)`)
    const [user] = await sql<{ id: string }[]>`
      INSERT INTO users (email, full_name)
      VALUES (${MEMBER_EMAIL}, ${MEMBER_NAME})
      ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING id
    `
    await sql`
      INSERT INTO memberships (user_id, club_id, role, status, joined_at)
      VALUES (${user!.id}, ${club.id}, 'member', 'active', CURRENT_DATE)
      ON CONFLICT (user_id, club_id) DO NOTHING
    `
  })
}

/** Nettoie le club créé + le membre seedé (par slug/email, clés stables). */
async function cleanup(): Promise<void> {
  await withDb(async (sql) => {
    // memberships/positions cascade sur clubs.id (ON DELETE CASCADE) → DELETE club suffit.
    await sql`DELETE FROM clubs WHERE slug = ${CLUB_SLUG}`
    await sql`DELETE FROM users WHERE email = ${MEMBER_EMAIL}`
  })
}

test.afterAll(async () => {
  await cleanup()
})

test('assistant ajout de club : infos → matrice (KO puis OK, gating Continuer) → import → responsable', async ({
  page,
}: {
  page: Page
}) => {
  await cleanup() // état propre si un run précédent a laissé des traces
  await loginAsSeedMember(page)

  // ── Étape 1 — Infos ────────────────────────────────────────────────────────
  await page.goto('/reseau/clubs/nouveau')
  await expect(page.getByRole('heading', { name: 'Infos du club' })).toBeVisible()

  await page.getByLabel(/^Nom du club/).fill(CLUB_NAME)
  // Le slug est auto-dérivé du nom ; on l'écrase par notre slug unique déterministe.
  const slugField = page.getByLabel(/^Slug/)
  await slugField.fill(CLUB_SLUG)
  await page.getByRole('button', { name: 'Continuer' }).click()

  // ── Étape 2 — Matrice ──────────────────────────────────────────────────────
  await expect(page.getByRole('heading', { name: 'Connecter la matrice' })).toBeVisible()
  const matrixField = page.getByLabel('URL ou ID de la feuille Google Sheets')

  // Email du Service Account copiable (l'encart de partage est présent).
  await expect(page.getByRole('button', { name: 'Copier' })).toBeVisible()

  // Cas KO : feuille non partagée → état not_shared, « Continuer » désactivé.
  await matrixField.fill('sheet-notshared-xyz')
  await page.getByRole('button', { name: 'Tester la connexion' }).click()
  await expect(page.getByText('Feuille non partagée')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuer' })).toBeDisabled()

  // Correction : ID OK → succès → « Continuer » activé.
  await matrixField.fill('sheet-ok-12345')
  await page.getByRole('button', { name: 'Tester la connexion' }).click()
  await expect(page.getByText(/18 membres/)).toBeVisible()
  // Copy POSITIONS : le succès n'affiche pas « Portefeuille » (onglet réel = POSITIONS).
  const continueBtn = page.getByRole('button', { name: 'Continuer' })
  await expect(continueBtn).toBeEnabled()
  await continueBtn.click()

  // ── Étape 3 — Import + responsable ──────────────────────────────────────────
  await expect(page.getByRole('heading', { name: 'Premier import & responsable' })).toBeVisible()

  // Seede un membre dans le club créé AVANT l'import (la sync mockée n'écrit rien en DB).
  await seedMemberInCreatedClub()

  await page.getByRole('button', { name: 'Lancer l’import' }).click()
  // SyncBanner « 18 membres importés ».
  await expect(page.getByText(/18 membres importés/)).toBeVisible()

  // Désigne le responsable : le select est peuplé du membre seedé.
  await page.getByRole('combobox', { name: 'Membre importé' }).click()
  await page.getByRole('option', { name: MEMBER_NAME }).click()

  // Terminer → redirige vers la fiche club /reseau/clubs/[id].
  await page.getByRole('button', { name: 'Terminer' }).click()
  await expect(page).toHaveURL(/\/reseau\/clubs\/[0-9a-f-]{36}/)

  // Vérifie en DB que le club a un staff actif (pas d'orphelin) + sa matrice branchée.
  await withDb(async (sql) => {
    const [row] = await sql<{ sheet_id: string | null; staff: number }[]>`
      SELECT c.sheet_id,
             (SELECT COUNT(*) FROM memberships m
               WHERE m.club_id = c.id AND m.role IN ('president','treasurer') AND m.status = 'active')::int AS staff
        FROM clubs c WHERE c.slug = ${CLUB_SLUG}
    `
    expect(row?.sheet_id).toBeTruthy()
    expect(row?.staff ?? 0).toBeGreaterThanOrEqual(1)
  })
})
