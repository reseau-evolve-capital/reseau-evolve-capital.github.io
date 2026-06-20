/**
 * Tests E2E — contrôle d'accès du scope RÉSEAU (NET-002).
 *
 * Le membre de seed (test@example.com) est `network_admin` (NET-001, seed.sql) → cas POSITIF
 * direct : il atteint /reseau (qui redirige vers /reseau/clubs, non encore livré → 404
 * transitoire assumé ; l'assertion porte sur l'URL `/reseau`, PAS sur le contenu).
 *
 * Cas NÉGATIF : on RETIRE localement sa ligne `network_members` (DELETE par email → robuste
 * au re-key user au login), on vérifie le redirect /reseau → /dashboard (middleware
 * is_network_member()), puis on RESTAURE la ligne en afterAll (network_admin/president,
 * identique au seed). Pattern de seeding local/réversible emprunté à admin.spec.ts.
 *
 * NB : la suppression/restauration se fait par EMAIL (jamais par id fixe) car le login
 * re-keye users.id (CASCADE network_members via migration 041) — l'email est la clé stable.
 *
 * Réf : NET-002, NET-001 (migration 040 helpers is_network_member), 041 (FK ON UPDATE CASCADE),
 *       admin.spec.ts (pattern), helpers.ts (loginAsSeedMember).
 */

import { test, expect } from '@playwright/test'
import postgres from 'postgres'

import { loginAsSeedMember, SEED_EMAIL } from './helpers'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

/** Exécute `fn` avec un client postgres mono-connexion, fermé en fin d'appel. */
async function withDb<T>(fn: (sql: ReturnType<typeof postgres>) => Promise<T>): Promise<T> {
  const sql = postgres(DB_URL, { max: 1 })
  try {
    return await fn(sql)
  } finally {
    await sql.end()
  }
}

/** Retire l'appartenance réseau du seed (par EMAIL → robuste au re-key user au login). */
async function removeSeedNetworkMembership(): Promise<void> {
  await withDb(async (sql) => {
    await sql`
      DELETE FROM network_members
       WHERE user_id IN (SELECT id FROM users WHERE email = ${SEED_EMAIL})
    `
  })
}

/** Restaure l'appartenance réseau du seed (network_admin/president, état seed). Idempotent. */
async function restoreSeedNetworkMembership(): Promise<void> {
  await withDb(async (sql) => {
    await sql`
      INSERT INTO network_members (user_id, role, title)
      SELECT id, 'network_admin'::network_role, 'president'::network_title
        FROM users
       WHERE email = ${SEED_EMAIL}
      ON CONFLICT (user_id) DO UPDATE
         SET role = 'network_admin'::network_role, title = 'president'::network_title
    `
  })
}

// Garantit l'état seed (membre réseau présent) pour les autres specs, quoi qu'il arrive.
test.afterAll(async () => {
  await restoreSeedNetworkMembership()
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 1 : membre RÉSEAU → atteint /reseau (URL commence par /reseau, pas /dashboard)
// ─────────────────────────────────────────────────────────────────────────────
test('membre réseau → accède à /reseau', async ({ page }) => {
  // Le seed est network_admin (seed.sql) → membre réseau.
  await restoreSeedNetworkMembership()
  await loginAsSeedMember(page)

  // Non-régression : l'entrée de nav « Réseau » (sidebar) doit être un lien actif vers /reseau
  // pour un membre réseau (role-aware NET-002). Garde contre la disparition de l'accès au
  // réseau dans le chrome.
  await expect(page.locator('a[href="/reseau"]').first()).toBeVisible()

  await page.goto('/reseau')
  // /reseau redirige vers /reseau/clubs (NET-005, non livré) : l'important est qu'on RESTE
  // dans le scope /reseau (pas de redirect vers /dashboard par le middleware).
  await expect(page).toHaveURL(/\/reseau/)
  await expect(page).not.toHaveURL(/\/dashboard/)
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 2 : membre simple (sans rôle réseau) → redirigé hors de /reseau vers /dashboard
// ─────────────────────────────────────────────────────────────────────────────
test('membre simple → redirigé hors de /reseau', async ({ page }) => {
  // Retire l'appartenance réseau le temps du test : is_network_member() renverra false.
  await removeSeedNetworkMembership()
  try {
    await loginAsSeedMember(page)
    // Non-régression : sans rôle réseau, aucune entrée « Réseau » cliquable dans le chrome.
    await expect(page.locator('a[href="/reseau"]')).toHaveCount(0)
    await page.goto('/reseau')
    await expect(page).toHaveURL(/\/dashboard/)
  } finally {
    await restoreSeedNetworkMembership()
  }
})
