/**
 * E2E ADM-007 — contrôle d'accès membre (invitations + verrou + écran suspendu).
 *
 * Stratégie de seeding LOCALE et réversible (cf. admin.spec.ts) :
 *   - beforeAll : élève le seed (test@example.com) en 'treasurer' + crée un membre dédié
 *     « LOCKME » (actif, onboarding terminé) qu'on bloquera/débloquera ; nettoie l'invitation
 *     de test + son user allowlist (idempotence).
 *   - afterAll : restaure le seed en 'member', supprime LOCKME (par EMAIL — robuste au re-key
 *     du login) et l'invitation de test.
 *
 * Le seed et LOCKME sont identifiés par EMAIL : generate_link déclenche handle_new_user qui
 * re-keye public.users.id (CASCADE memberships.user_id). Les events d'accès partent en CASCADE
 * à la suppression du membership.
 *
 * Flows couverts :
 *   1. Invitation : invite → lien copiable + ligne « En attente » → révoque → « Révoquée ».
 *   2. Verrou : trésorier bloque → le membre est redirigé vers /acces-suspendu → déblocage →
 *      accès rétabli (plus de redirection).
 *   3. A11y (axe) : /admin/invitations (trésorier) + /acces-suspendu (membre bloqué).
 *
 * Réf : ADM-007, CLAUDE.md (RLS treasurer, a11y AA, copy FR, jamais service-role côté trésorier).
 */

import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import postgres from 'postgres'

import { loginAsSeedMember, generateMagicLink, SEED_EMAIL } from './helpers'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const SEED_CLUB_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

const LOCKME = {
  id: 'cccccccc-0000-0000-0000-000000000007',
  email: 'lockme.e2e@example.com',
  fullName: 'LOCKME Tester',
}
const INVITE_EMAIL = 'invite.e2e@example.com'
const PROVISION_EMAIL = 'provision.e2e@example.com'

const BLOCKING = new Set(['critical', 'serious'])

// ─── Helpers DB ──────────────────────────────────────────────────────────────

async function withDb<T>(fn: (sql: ReturnType<typeof postgres>) => Promise<T>): Promise<T> {
  const sql = postgres(DB_URL, { max: 1 })
  try {
    return await fn(sql)
  } finally {
    await sql.end()
  }
}

async function setSeedRole(role: 'member' | 'treasurer'): Promise<void> {
  await withDb(async (sql) => {
    await sql`
      UPDATE memberships SET role = ${role}::member_role
       WHERE club_id = ${SEED_CLUB_ID}::uuid
         AND user_id IN (SELECT id FROM users WHERE email = ${SEED_EMAIL})
    `
  })
}

async function seedLockMe(): Promise<void> {
  await withDb(async (sql) => {
    await sql`
      INSERT INTO users (id, email, full_name, onboarding_completed)
      VALUES (${LOCKME.id}::uuid, ${LOCKME.email}, ${LOCKME.fullName}, true)
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, onboarding_completed = true
    `
    // is_active GENERATED (status='active') → jamais inséré ; access_status remis à 'active'.
    await sql`
      INSERT INTO memberships (id, user_id, club_id, role, status, joined_at)
      VALUES (${LOCKME.id}::uuid, ${LOCKME.id}::uuid, ${SEED_CLUB_ID}::uuid, 'member', 'active', '2021-01-01')
      ON CONFLICT (user_id, club_id) DO UPDATE
        SET status = 'active', role = 'member', access_status = 'active',
            locked_at = NULL, locked_reason = NULL, locked_by = NULL
    `
    await sql`
      INSERT INTO contributions (membership_id, club_id, months_count, detention_pct,
        total_contributed, status, amount_due, synced_at)
      SELECT mem.id, ${SEED_CLUB_ID}::uuid, 10, 0.02, 1000, 'ok'::contribution_status, 0,
             NOW() - INTERVAL '10 minutes'
        FROM memberships mem WHERE mem.id = ${LOCKME.id}::uuid
      ON CONFLICT (membership_id) DO UPDATE SET status = 'ok', amount_due = 0
    `
  })
}

/** Supprime LOCKME + l'invitation de test (par EMAIL → robuste au re-key login). */
async function cleanup(): Promise<void> {
  await withDb(async (sql) => {
    await sql`DELETE FROM invitations WHERE club_id = ${SEED_CLUB_ID}::uuid AND lower(email) IN (${INVITE_EMAIL}, ${PROVISION_EMAIL})`
    // memberships des users de test (PROVISION : adhésion provisionnée à l'acceptation) — par EMAIL.
    await sql`DELETE FROM memberships WHERE user_id IN (SELECT id FROM users WHERE email IN (${LOCKME.email}, ${PROVISION_EMAIL}))`
    await sql`DELETE FROM users WHERE email IN (${LOCKME.email}, ${INVITE_EMAIL}, ${PROVISION_EMAIL})`
    // Supprime aussi l'entrée auth.users : sinon, à la connexion suivante, handle_new_user
    // (AFTER INSERT) ne se redéclenche pas → public.users.id ne serait pas re-keyé sur l'uuid
    // GoTrue → mismatch auth.uid()/profil. Garantit l'idempotence entre runs (comme global-setup).
    await sql`DELETE FROM auth.users WHERE lower(email) IN (${LOCKME.email}, ${INVITE_EMAIL}, ${PROVISION_EMAIL})`
  })
}

/** Connecte la `page` comme `email` (magic link admin) ; n'attend que la sortie de /login/verify. */
async function loginAs(page: Page, email: string): Promise<void> {
  const token = await generateMagicLink(email)
  await page.goto(`/login/verify?token_hash=${token}&type=email`)
  await page.waitForURL((url) => !url.pathname.startsWith('/login/verify'), { timeout: 20_000 })
}

async function expectNoSeriousA11y(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('nextjs-portal')
    .exclude('[data-nextjs-toast]')
    .exclude('.tsqd-parent-container')
    .exclude('[aria-label*="Tanstack" i]')
    .analyze()
  const blocking = results.violations.filter((v) => BLOCKING.has(v.impact ?? ''))
  const summary = blocking.map((v) => `${v.id} (${v.impact}) × ${v.nodes.length} — ${v.help}`)
  expect(blocking, `Violations a11y bloquantes sur ${label} :\n${summary.join('\n')}`).toEqual([])
}

// ─── Cycle de vie ──────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  await cleanup()
  await seedLockMe()
  await setSeedRole('treasurer')
})

test.afterAll(async () => {
  await setSeedRole('member')
  await cleanup()
})

// ─── Tests ─────────────────────────────────────────────────────────────────────

test('invitations : invite → lien copiable + ligne en attente → révoque', async ({ page }) => {
  await loginAsSeedMember(page)
  await page.goto('/admin/invitations')
  await expect(page.getByRole('heading', { name: 'Invitations' })).toBeVisible()

  await page.getByRole('textbox', { name: /Adresse e-mail/i }).fill(INVITE_EMAIL)
  // exact:true → ne pas matcher les boutons « Renvoyer l'invitation (…) » des lignes existantes.
  await page.getByRole('button', { name: "Envoyer l'invitation", exact: true }).click()

  // Le lien d'accès clair s'affiche (panneau copiable) — V0 sans envoi auto.
  await expect(page.locator('input[readonly]')).toHaveValue(/\/login\/invite\?token=/)

  // La nouvelle invitation apparaît « En attente ».
  const row = page.getByRole('row', { name: new RegExp(INVITE_EMAIL) })
  await expect(row).toBeVisible()
  await expect(row.getByText('En attente')).toBeVisible()

  // Révocation → statut « Révoquée ».
  await row.getByRole('button', { name: /Révoquer/ }).click()
  await expect(row.getByText('Révoquée')).toBeVisible()
})

test('invitation acceptée → adhésion provisionnée dans le club', async ({ page }) => {
  // 1. Le trésorier invite un nouvel email et récupère le lien d'accès affiché.
  await loginAsSeedMember(page)
  await page.goto('/admin/invitations')
  await page.getByRole('textbox', { name: /Adresse e-mail/i }).fill(PROVISION_EMAIL)
  await page.getByRole('button', { name: "Envoyer l'invitation", exact: true }).click()
  const link = await page.locator('input[readonly]').inputValue()
  expect(link).toMatch(/\/login\/invite\?token=/)

  // 2. L'invité (déconnecté) ouvre le lien → acceptation → onboarding « invité ».
  await page.context().clearCookies()
  await page.goto(link)
  await expect(page).toHaveURL(/\/onboarding\/step-1/, { timeout: 15_000 })

  // 3. L'adhésion a été provisionnée (membre actif du club de l'invitation).
  const rows = await withDb(
    (sql) => sql`
      SELECT m.role::text AS role, m.status::text AS status
        FROM memberships m JOIN users u ON u.id = m.user_id
       WHERE lower(u.email) = ${PROVISION_EMAIL} AND m.club_id = ${SEED_CLUB_ID}::uuid
    `
  )
  expect(rows.length).toBe(1)
  expect(rows[0]?.role).toBe('member')
  expect(rows[0]?.status).toBe('active')
})

test('verrou : blocage → /acces-suspendu → déblocage → accès rétabli', async ({ page }) => {
  // 1. Le trésorier bloque LOCKME via la modale.
  await loginAsSeedMember(page)
  await page.goto('/admin/members')
  const row = page.getByRole('row', { name: /LOCKME Tester/ })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: "Bloquer l'accès" }).click()
  await page.getByRole('dialog').getByRole('button', { name: "Bloquer l'accès" }).click()
  await expect(row.getByText('Bloqué')).toBeVisible()

  // 2. LOCKME se connecte → redirigé vers /acces-suspendu.
  await page.context().clearCookies()
  await loginAs(page, LOCKME.email)
  await expect(page).toHaveURL(/\/acces-suspendu/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'Votre accès a été suspendu.' })).toBeVisible()

  // 3. Le trésorier débloque LOCKME.
  await page.context().clearCookies()
  await loginAsSeedMember(page)
  await page.goto('/admin/members')
  const row2 = page.getByRole('row', { name: /LOCKME Tester/ })
  await row2.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Débloquer' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Débloquer' }).click()
  await expect(row2.getByRole('status').filter({ hasText: 'Actif' })).toBeVisible()

  // 4. LOCKME se reconnecte → accès rétabli (plus de redirection suspendu).
  await page.context().clearCookies()
  await loginAs(page, LOCKME.email)
  await expect(page).not.toHaveURL(/\/acces-suspendu/)
})

test('a11y : /admin/invitations (trésorier) — 0 violation bloquante', async ({ page }) => {
  await loginAsSeedMember(page)
  await page.goto('/admin/invitations')
  await expect(page.getByRole('heading', { name: 'Invitations' })).toBeVisible()
  await expectNoSeriousA11y(page, '/admin/invitations')
})

test('a11y : /admin/members (colonne Accès + badges) — 0 violation bloquante', async ({ page }) => {
  await loginAsSeedMember(page)
  await page.goto('/admin/members')
  await expect(page.getByRole('heading', { name: /Membres/ })).toBeVisible()
  await expectNoSeriousA11y(page, '/admin/members')
})

test('a11y : /acces-suspendu (membre bloqué) — 0 violation bloquante', async ({ page }) => {
  // Bloque LOCKME en base puis connecte-le.
  await withDb(async (sql) => {
    await sql`
      UPDATE memberships SET access_status = 'locked', locked_at = NOW()
       WHERE user_id IN (SELECT id FROM users WHERE email = ${LOCKME.email})
         AND club_id = ${SEED_CLUB_ID}::uuid
    `
  })
  await loginAs(page, LOCKME.email)
  await expect(page).toHaveURL(/\/acces-suspendu/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'Votre accès a été suspendu.' })).toBeVisible()
  await expectNoSeriousA11y(page, '/acces-suspendu')
})
