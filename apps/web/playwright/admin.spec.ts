/**
 * Tests E2E — flow admin trésorier (ADM-006).
 *
 * Stratégie de seeding LOCAL et entièrement réversible (déviation assumée du plan) :
 *   On NE touche PAS global-setup.ts. Raison : contributions.spec.ts résout son membership
 *   via `SELECT id FROM memberships WHERE club_id=… LIMIT 1` — seeder des membres
 *   supplémentaires GLOBALEMENT rendrait ce LIMIT 1 ambigu et casserait contributions.spec.
 *   Tout le seeding admin (élévation du rôle du seed + 2 membres extra) est donc local à
 *   ce fichier (beforeAll/afterAll), isolé et réversible :
 *     - beforeAll : seede 2 membres extra (BAMBA « ok », COLY « late » → seul impayé) et
 *       élève le seed au rôle 'treasurer' le temps de la suite.
 *     - afterAll : RESTAURE le seed en 'member' et supprime les 2 extra (contributions
 *       CASCADE via FK ON DELETE CASCADE). Aucune pollution des autres specs.
 *   Le seed reste 'member' pour les autres specs (dashboard, contributions, portfolio).
 *
 * Le seed est TOUJOURS identifié par EMAIL (jamais par id fixe) : le login re-keye
 * users.id du seed (CASCADE sur memberships.user_id), donc l'email est la clé robuste.
 *
 * Le membre sans rôle staff est refusé sur /admin via le middleware user_is_staff() →
 * redirect /dashboard (on bascule temporairement le seed en 'member' pour ce test).
 *
 * Le bouton de sync est vérifié présent (parité trésorier) mais JAMAIS cliqué :
 * l'Edge Function sync n'est pas déployée en local, l'invoke renverrait 502.
 *
 * Lighthouse / CI : hors scope (décision de cadrage — la CI ne lance pas Playwright).
 *
 * Réf : ADM-006, CLAUDE.md (RLS treasurer, a11y AA, copy FR, jamais de NaN/undefined).
 */

import { test, expect } from '@playwright/test'
import postgres from 'postgres'

import { loginAsSeedMember, SEED_EMAIL } from './helpers'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const SEED_CLUB_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

// ─────────────────────────────────────────────────────────────────────────────
// Membres extra (uuids EXPLICITES → cleanup déterministe)
// ─────────────────────────────────────────────────────────────────────────────

type ExtraMember = {
  id: string // sert d'id pour users ET memberships (on fixe l'uuid)
  email: string
  fullName: string
  total: number
  detention: number
  months: number
  status: 'ok' | 'pending' | 'late' | 'exempt'
  due: number
}

const EXTRA_MEMBERS: ExtraMember[] = [
  {
    id: 'cccccccc-0000-0000-0000-000000000002',
    email: 'bamba.e2e@example.com',
    fullName: 'BAMBA Inès',
    total: 1200,
    detention: 0.05,
    months: 12,
    status: 'ok',
    due: 0,
  },
  {
    id: 'cccccccc-0000-0000-0000-000000000003',
    email: 'coly.e2e@example.com',
    fullName: 'COLY Marc',
    total: 800,
    detention: 0.03,
    months: 8,
    status: 'late', // SEUL impayé
    due: 150,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers DB
// ─────────────────────────────────────────────────────────────────────────────

/** Exécute `fn` avec un client postgres mono-connexion, fermé en fin d'appel. */
async function withDb<T>(fn: (sql: ReturnType<typeof postgres>) => Promise<T>): Promise<T> {
  const sql = postgres(DB_URL, { max: 1 })
  try {
    return await fn(sql)
  } finally {
    await sql.end()
  }
}

/** Bascule le rôle du seed (identifié par EMAIL → robuste au re-key user au login). */
async function setSeedRole(role: 'member' | 'treasurer'): Promise<void> {
  await withDb(async (sql) => {
    await sql`
      UPDATE memberships
         SET role = ${role}::member_role
       WHERE club_id = ${SEED_CLUB_ID}::uuid
         AND user_id IN (SELECT id FROM users WHERE email = ${SEED_EMAIL})
    `
  })
}

/** Crée (idempotent) les 2 membres extra : users + memberships + contributions. */
async function seedExtraMembers(): Promise<void> {
  await withDb(async (sql) => {
    for (const m of EXTRA_MEMBERS) {
      await sql`
        INSERT INTO users (id, email, full_name)
        VALUES (${m.id}::uuid, ${m.email}, ${m.fullName})
        ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name
      `
      // is_active est une colonne GENERATED (status='active') → on ne l'insère/met pas à jour ;
      // on garantit status='active' à la place (cf. migration 004).
      await sql`
        INSERT INTO memberships (id, user_id, club_id, role, status, joined_at)
        VALUES (${m.id}::uuid, ${m.id}::uuid, ${SEED_CLUB_ID}::uuid, 'member', 'active', '2020-01-01')
        ON CONFLICT (user_id, club_id) DO UPDATE SET status = 'active', role = 'member'
      `
      await sql`
        INSERT INTO contributions (
          membership_id, club_id, months_count, detention_pct, total_contributed,
          status, amount_due, synced_at
        )
        SELECT mem.id, ${SEED_CLUB_ID}::uuid, ${m.months}, ${m.detention}, ${m.total},
               ${m.status}::contribution_status, ${m.due}, NOW() - INTERVAL '10 minutes'
          FROM memberships mem
         WHERE mem.id = ${m.id}::uuid
        ON CONFLICT (membership_id) DO UPDATE
           SET status            = EXCLUDED.status,
               amount_due        = EXCLUDED.amount_due,
               total_contributed = EXCLUDED.total_contributed,
               months_count      = EXCLUDED.months_count,
               detention_pct     = EXCLUDED.detention_pct,
               synced_at         = EXCLUDED.synced_at,
               updated_at        = NOW()
      `
    }
  })
}

/** Supprime les 2 membres extra. contributions CASCADE via FK ON DELETE CASCADE. */
async function cleanupExtraMembers(): Promise<void> {
  const ids = EXTRA_MEMBERS.map((m) => m.id)
  await withDb(async (sql) => {
    // memberships d'abord → contributions/contribution_months supprimés par CASCADE.
    await sql`DELETE FROM memberships WHERE id IN ${sql(ids)}`
    await sql`DELETE FROM users WHERE id IN ${sql(ids)}`
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Cycle de vie
// ─────────────────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  await seedExtraMembers()
  await setSeedRole('treasurer')
})

test.afterAll(async () => {
  await setSeedRole('member')
  await cleanupExtraMembers()
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 1 : Membre sans rôle staff → redirigé hors de /admin
// ─────────────────────────────────────────────────────────────────────────────
test('membre sans rôle staff → redirigé hors de /admin', async ({ page }) => {
  // Bascule temporaire en 'member' : le middleware user_is_staff() renvoie false → /dashboard.
  await setSeedRole('member')
  try {
    await loginAsSeedMember(page)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/dashboard/)
  } finally {
    await setSeedRole('treasurer')
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 2 : Dashboard admin → KPIs + alerte impayé
// ─────────────────────────────────────────────────────────────────────────────
test('dashboard admin → KPIs + alerte impayé', async ({ page }) => {
  await loginAsSeedMember(page)
  await page.goto('/admin')

  await expect(page.getByRole('heading', { name: 'Espace trésorier' })).toBeVisible()
  await expect(page.getByText('Membres actifs')).toBeVisible()
  await expect(page.getByText('Membres en impayé')).toBeVisible()
  // COLY est le seul impayé → l'alerte (role=alert, tokens data-warning) mentionne « impayé ».
  // `getByRole('alert')` matche aussi le __next-route-announcer__ (vide) de Next → strict mode
  // violation. On filtre l'alerte par son texte (apostrophe typographique « ’ » dans la copie).
  await expect(page.getByRole('alert').filter({ hasText: /impayé/ })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 3 : Liste des membres + filtre impayé
// ─────────────────────────────────────────────────────────────────────────────
test('liste des membres + filtre impayé', async ({ page }) => {
  await loginAsSeedMember(page)
  await page.goto('/admin/members')

  // 3 membres : seed (Test Membre) + BAMBA + COLY.
  await expect(page.getByTestId('member-row')).toHaveCount(3)

  // Le Switch (Radix, role=switch) reçoit ses classes Tailwind h-6/w-11 mais sa box mesure
  // 0×0 dans apps/web (les utilitaires ne sont pas générés pour cet atome → défaut de styling
  // hors scope E2E, à traiter en ADM-007/CSS). Playwright le juge alors « not visible » et
  // refuse `.click()`. On clique le <label htmlFor> associé (déclenche le contrôle lié) — c'est
  // l'interaction réelle d'un utilisateur (clic sur le libellé du toggle).
  await page.getByText('Afficher seulement les membres en impayé').click()

  // Seul COLY est impayé (status 'late', amount_due 150).
  await expect(page.getByTestId('member-row')).toHaveCount(1)
  await expect(page.getByText('COLY Marc')).toBeVisible()
  await expect(page).toHaveURL(/impayes=true/)
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 4 : Bandeau de sync présent (parité trésorier)
// ─────────────────────────────────────────────────────────────────────────────
test('bandeau de sync présent (parité trésorier)', async ({ page }) => {
  await loginAsSeedMember(page)
  await page.goto('/admin')

  // NE PAS cliquer : l'Edge Function sync n'est pas déployée en local (invoke → 502).
  // On vérifie juste la présence/parité du bouton du SyncBanner.
  await expect(page.getByRole('button', { name: 'Actualiser les données' })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 5 : Cotisations → filtre par membre présent + stats
// ─────────────────────────────────────────────────────────────────────────────
test('cotisations : filtre par membre présent + stats', async ({ page }) => {
  await loginAsSeedMember(page)
  await page.goto('/admin/cotisations')

  await expect(page.getByRole('heading', { name: 'Cotisations du club' })).toBeVisible()
  await expect(page.getByText('Versement moyen')).toBeVisible()
  await expect(page.getByLabel('Filtrer par membre')).toBeVisible()
})
