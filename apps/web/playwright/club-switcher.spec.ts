/**
 * Tests E2E — ClubSwitcher : le rôle suit le CLUB ACTIF (cookie `evolve_active_club`).
 *
 * Bug reproduit : un membre président d'un club A et simple membre d'un club B basculait
 * via le ClubSwitcher mais les surfaces role-aware ne changeaient pas — l'entrée
 * « Espace trésorier » restait affichée et /admin restait accessible sur le club B.
 * Cause : `isStaff` (RPC user_is_staff() globale) et `resolveAdminContext` (club staff le
 * plus récent) ignoraient le cookie de club actif. Désormais le rôle est scopé au club actif.
 *
 * Fixture : le membre de seed (test@example.com) est DÉJÀ multi-club (Club E2E + Club Votes
 * E2E), tous deux `member`. On élève son rôle à `president` dans Club E2E le temps de la
 * suite (afterAll restaure `member`), puis on bascule le club actif via le cookie et on
 * vérifie l'apparition/disparition des surfaces admin. Aucun autre spec n'est impacté
 * (rôle restauré, aucun club créé/supprimé).
 *
 * Réf : bug « ClubSwitcher — vues role-aware inchangées au switch », CLAUDE.md (RLS, a11y).
 */

import { test, expect } from '@playwright/test'
import postgres from 'postgres'

import { loginAsSeedMember, SEED_EMAIL } from './helpers'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const PRESIDENT_CLUB = 'aaaaaaaa-0000-0000-0000-000000000001' // Club E2E
const MEMBER_CLUB = 'eeeeeeee-0000-0000-0000-000000000001' // Club Votes E2E
const ACTIVE_CLUB_COOKIE = 'evolve_active_club'

/** Bascule le rôle du seed (par EMAIL → robuste au re-key user au login) dans un club donné. */
async function setSeedRole(clubId: string, role: string): Promise<void> {
  const sql = postgres(DB_URL, { max: 1 })
  try {
    await sql`
      UPDATE public.memberships m
         SET role = ${role}
        FROM public.users u
       WHERE u.id = m.user_id AND u.email = ${SEED_EMAIL} AND m.club_id = ${clubId}::uuid
    `
  } finally {
    await sql.end()
  }
}

/** Pose le cookie de club actif sur l'origine courante, puis recharge le dashboard. */
async function switchActiveClub(page: import('@playwright/test').Page, clubId: string) {
  const origin = new URL(page.url()).origin
  await page.context().addCookies([
    {
      name: ACTIVE_CLUB_COOKIE,
      value: clubId,
      url: origin,
      sameSite: 'Lax',
      secure: false,
    },
  ])
  await page.goto('/dashboard')
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
}

test.describe('ClubSwitcher — le rôle suit le club actif', () => {
  // État déterministe : président dans un club, simple membre dans l'autre. On fixe
  // EXPLICITEMENT les deux rôles (le rôle de club du seed peut dériver entre runs — ex.
  // `network_admin` est aussi un rôle staff) ; afterAll restaure le défaut seed (`member`).
  test.beforeAll(async () => {
    await setSeedRole(PRESIDENT_CLUB, 'president')
    await setSeedRole(MEMBER_CLUB, 'member')
  })
  test.afterAll(async () => {
    await setSeedRole(PRESIDENT_CLUB, 'member')
    await setSeedRole(MEMBER_CLUB, 'member')
  })

  test('club actif où l’user est président → « Espace trésorier » visible + /admin accessible', async ({
    page,
  }) => {
    await loginAsSeedMember(page)
    await switchActiveClub(page, PRESIDENT_CLUB)

    // Entrée admin de la sidebar (rendue en <a href="/admin"> uniquement si staff du club actif).
    await expect(page.locator('a[href="/admin"]').first()).toBeVisible()

    // /admin doit s'ouvrir (pas de 403).
    await page.goto('/admin')
    await expect(page.getByText('Accès refusé')).toHaveCount(0)
  })

  test('club actif où l’user est simple membre → pas d’« Espace trésorier » + /admin refusé', async ({
    page,
  }) => {
    await loginAsSeedMember(page)
    await switchActiveClub(page, MEMBER_CLUB)

    // Aucune entrée admin : le rôle membre du club actif masque la surface staff.
    await expect(page.locator('a[href="/admin"]')).toHaveCount(0)

    // /admin refusé (le middleware laisse passer le staff global, le garde par-club tranche).
    await page.goto('/admin')
    await expect(page.getByText('Accès refusé')).toBeVisible()
  })
})
