/**
 * Tests E2E — rôle club `secretary` en LECTURE SEULE (migrations 061/062 + gating app).
 *
 * Prouve en RUNTIME ce que les tests unitaires ne couvrent pas : la garde d'ENTRÉE.
 *   1. Le secrétaire est ADMIS dans /admin (middleware self-read memberships + garde RSC
 *      getAdminContext via canViewClubAdmin) — il n'est PAS redirigé vers /dashboard.
 *   2. Le bandeau « Lecture seule » s'affiche (canManage=false dérivé du rôle).
 *   3. La liste des membres (lecture) est visible.
 *   4. Sur /admin/settings, aucun bouton « Enregistrer » (action de gestion masquée).
 *
 * L'isolation DB (lecture OK / écriture refusée 42501) est prouvée par
 * supabase/tests/secretary_read_access.sql ; le gating fin par les tests unitaires.
 *
 * Auth : `loginAsSeedMember` connecte le membre seed ; on bascule son rôle club en 'secretary'
 * le temps de la suite (même pattern que no-horizontal-scroll.spec.ts), remis à 'member' après.
 */

import { test, expect } from '@playwright/test'
import postgres from 'postgres'

import { loginAsSeedMember, SEED_EMAIL } from './helpers'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const SEED_CLUB_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

async function setSeedRole(role: 'member' | 'secretary'): Promise<void> {
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

test.describe("rôle secretary — lecture seule de l'espace admin", () => {
  test.beforeAll(async () => {
    await setSeedRole('secretary')
  })
  test.afterAll(async () => {
    await setSeedRole('member')
  })

  test('le secrétaire accède à /admin en lecture (badge + liste, pas de redirection)', async ({
    page,
  }) => {
    await loginAsSeedMember(page)
    await page.goto('/admin/members')
    await page.waitForLoadState('networkidle')

    // 1. Admis dans /admin (pas de redirection vers /dashboard par le middleware).
    expect(new URL(page.url()).pathname).toBe('/admin/members')

    // 2. Bandeau « Lecture seule » présent (canManage=false).
    await expect(page.getByText('Lecture seule')).toBeVisible()

    // 3. Lecture des membres : le titre de la vue est rendu.
    await expect(page.getByRole('heading', { name: /Membres du club/i })).toBeVisible()
  })

  test('le secrétaire ne voit aucune action de gestion sur /admin/settings', async ({ page }) => {
    await loginAsSeedMember(page)
    await page.goto('/admin/settings')
    await page.waitForLoadState('networkidle')

    expect(new URL(page.url()).pathname).toBe('/admin/settings')
    await expect(page.getByText('Lecture seule')).toBeVisible()
    // Aucune action d'écriture : pas de bouton « Enregistrer ».
    await expect(page.getByRole('button', { name: /Enregistrer/i })).toHaveCount(0)
  })
})
