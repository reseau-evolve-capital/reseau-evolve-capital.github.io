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

// ─────────────────────────────────────────────────────────────────────────────
// NAV-001 — Flux UI mobile « Changer de club » depuis le menu avatar
// ─────────────────────────────────────────────────────────────────────────────
//
// Couvre la mécanique de bout en bout côté UI (≠ bloc ci-dessus qui pose le cookie
// directement) : viewport mobile 375, ouverture du menu avatar (DropdownMenu Radix),
// présence de l'entrée « Changer de club » (data-testid `topbar-change-club`) en contexte
// multi-club, ouverture du sélecteur (Dialog/bottom-sheet), sélection d'un autre club,
// puis vérification que le club actif a bien basculé (la surface admin suit le rôle du club).
//
// Cas mono-club : on désactive temporairement la 2ᵉ adhésion (is_active=false) → l'entrée
// disparaît (AppChrome ne rend « Changer de club » que si ≥ 2 adhésions actives). afterEach
// restaure is_active=true pour ne pas polluer les autres specs.

/** (Dé)active une adhésion du seed dans un club (par EMAIL → robuste au re-key user). */
async function setSeedMembershipActive(clubId: string, active: boolean): Promise<void> {
  const sql = postgres(DB_URL, { max: 1 })
  try {
    await sql`
      UPDATE public.memberships m
         SET is_active = ${active}
        FROM public.users u
       WHERE u.id = m.user_id AND u.email = ${SEED_EMAIL} AND m.club_id = ${clubId}::uuid
    `
  } finally {
    await sql.end()
  }
}

test.describe('NAV-001 — « Changer de club » (flux UI mobile, menu avatar)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  // État déterministe : président d'un club, simple membre de l'autre, les DEUX actifs.
  test.beforeAll(async () => {
    await setSeedRole(PRESIDENT_CLUB, 'president')
    await setSeedRole(MEMBER_CLUB, 'member')
    await setSeedMembershipActive(PRESIDENT_CLUB, true)
    await setSeedMembershipActive(MEMBER_CLUB, true)
  })
  test.afterAll(async () => {
    await setSeedRole(PRESIDENT_CLUB, 'member')
    await setSeedRole(MEMBER_CLUB, 'member')
    // Filet : garantir les deux adhésions actives pour les specs suivantes.
    await setSeedMembershipActive(PRESIDENT_CLUB, true)
    await setSeedMembershipActive(MEMBER_CLUB, true)
  })

  test('multi-club : ouvre le menu avatar → « Changer de club » → sélectionne → le rôle suit le club', async ({
    page,
  }) => {
    await loginAsSeedMember(page)
    // Partir d'un club actif connu (président) pour que le switch vers l'autre soit observable.
    await switchActiveClub(page, PRESIDENT_CLUB)
    await expect(page.locator('a[href="/admin"]').first()).toBeVisible()

    // Ouvrir le menu avatar (DropdownMenu Radix). aria-label « Menu utilisateur » (cf. @evolve/ui).
    await page.getByRole('button', { name: /Menu utilisateur/ }).click()

    // L'entrée « Changer de club » est présente en contexte multi-club.
    const changeClub = page.getByTestId('topbar-change-club')
    await expect(changeClub).toBeVisible()
    await changeClub.click()

    // Le sélecteur (Dialog/bottom-sheet) s'ouvre et liste les clubs.
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Sélectionner l'AUTRE club (celui où l'user est simple membre) déclenche le switch
    // (Server Action setActiveClub → cookie → window.location.reload()).
    await dialog.getByText('Club Votes E2E').click()
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })

    // Le rôle suit le nouveau club actif : plus d'entrée admin, /admin refusé.
    await expect(page.locator('a[href="/admin"]')).toHaveCount(0)
    await page.goto('/admin')
    await expect(page.getByText('Accès refusé')).toBeVisible()
  })

  test('mono-club : aucune entrée « Changer de club » dans le menu avatar', async ({ page }) => {
    // Réduire le seed à UNE seule adhésion active le temps du test.
    await setSeedMembershipActive(MEMBER_CLUB, false)
    try {
      await loginAsSeedMember(page)
      await switchActiveClub(page, PRESIDENT_CLUB)

      await page.getByRole('button', { name: /Menu utilisateur/ }).click()
      // L'entrée n'est PAS rendue (AppChrome exige ≥ 2 adhésions actives).
      await expect(page.getByTestId('topbar-change-club')).toHaveCount(0)
    } finally {
      await setSeedMembershipActive(MEMBER_CLUB, true)
    }
  })
})
