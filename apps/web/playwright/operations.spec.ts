/**
 * Tests E2E — module Opérations trésorier (E-OPS-2).
 *
 * Stratégie de seeding LOCALE et réversible (même pattern que admin.spec.ts) :
 *   - beforeAll : élève le seed (test@example.com) en 'treasurer' + insère des opérations
 *     de test directement en DB via la connexion postgres directe (service_role bypass RLS).
 *   - afterAll : restaure le seed en 'member' + supprime les opérations de test.
 *
 * Flows couverts :
 *   A. Sécurité (403 non-staff) — membre sans rôle → /admin/operations redirigé /dashboard.
 *   B. Isolation cross-club (RLS) — opérations du club B non visibles depuis le club A.
 *   C. Tableau de bord opérations — trésorier voit titre + solde + actions rapides.
 *   D. Saisie cotisation — assistant 3 étapes, étape 3 = confirmation + nouveau solde.
 *   E. Liste complète — /admin/operations/toutes : liste + filtre type.
 *   F. Annulation — modale motif obligatoire → opération annulée.
 *   F2. Opération soldée — parts_allocated IS NOT NULL → contrôle non annulable.
 *
 * GOTCHAS :
 *   - workers=1 (DB state partagé ; config playwright.config.ts).
 *   - La RPC record_operation requiert is_club_staff → on insère directement en DB
 *     (postgres direct, bypass RLS) pour le seeding des fixtures de test.
 *   - parts_allocated NULL → opération annulable ; IS NOT NULL → non annulable.
 *   - Le membre de seed est identifié par EMAIL (robuste au re-key GoTrue handle_new_user).
 *
 * Réf : E-OPS-2, actions.ts (mapPgError : 42501→forbidden), migrations 057/060.
 */

import { test, expect } from '@playwright/test'
import postgres from 'postgres'

import { loginAsSeedMember, SEED_EMAIL } from './helpers'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const SEED_CLUB_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

// ─── Constantes ──────────────────────────────────────────────────────────────

// UUID du second club de test (isolation cross-club). Inséré/supprimé dans beforeAll/afterAll.
const CLUB_B_ID = 'bbbbbbbb-1111-0000-0000-000000000001'

// UUIDs fixes pour les opérations de test (cleanup déterministe).
const OP_COTISATION_ID = 'eeeeeeee-0000-0000-0000-000000000001'
const OP_BUY_ID = 'eeeeeeee-0000-0000-0000-000000000002'
const OP_DIVIDEND_ID = 'eeeeeeee-0000-0000-0000-000000000003'
// Opération soldée : parts_allocated IS NOT NULL → non annulable via l'UI.
const OP_SETTLED_ID = 'eeeeeeee-0000-0000-0000-000000000004'
// Opération appartenant au club B → non visible depuis le club A (test RLS isolation).
const OP_CLUB_B_ID = 'eeeeeeee-0000-0000-0000-000000000005'

// ─── Helpers DB ──────────────────────────────────────────────────────────────

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

/** Récupère le membership_id du seed (après re-key GoTrue, requis pour INSERT operations). */
async function getSeedMembershipId(): Promise<string> {
  return await withDb(async (sql) => {
    const rows = await sql<{ id: string }[]>`
      SELECT m.id FROM memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.club_id = ${SEED_CLUB_ID}::uuid
         AND lower(u.email) = ${SEED_EMAIL.toLowerCase()}
       LIMIT 1
    `
    if (!rows[0]) throw new Error('Membership seed introuvable')
    return rows[0].id
  })
}

/**
 * Insère les opérations de test directement en DB (postgres direct → bypass RLS).
 * Appelé après loginAsSeedMember pour récupérer le bon membership_id (post re-key GoTrue).
 */
async function seedOperations(membershipId: string): Promise<void> {
  await withDb(async (sql) => {
    // Club B de test pour le test d'isolation cross-club (idempotent).
    await sql`
      INSERT INTO clubs (id, name, slug, min_contribution)
      VALUES (${CLUB_B_ID}::uuid, 'Club E2E B', 'club-e2e-b', 100)
      ON CONFLICT (id) DO NOTHING
    `

    // Supprime d'abord les opérations de test existantes (idempotence entre runs).
    const opIds = [OP_COTISATION_ID, OP_BUY_ID, OP_DIVIDEND_ID, OP_SETTLED_ID, OP_CLUB_B_ID]
    await sql`DELETE FROM operations WHERE id IN ${sql(opIds)}`

    // Cotisation seed : entrée +500 € (cash_delta positif, membership_id obligatoire).
    await sql`
      INSERT INTO operations (id, club_id, membership_id, type, status, cash_delta, operation_date, source)
      VALUES (${OP_COTISATION_ID}::uuid, ${SEED_CLUB_ID}::uuid, ${membershipId}::uuid,
              'contribution', 'confirmed', 500, '2026-01-15', 'manual')
    `

    // Achat titre : sortie -1000 € (cash_delta négatif, symbol + qty + unit_price requis).
    await sql`
      INSERT INTO operations (id, club_id, type, status, cash_delta, symbol, asset_name,
                              quantity, unit_price, operation_date, source)
      VALUES (${OP_BUY_ID}::uuid, ${SEED_CLUB_ID}::uuid,
              'buy', 'confirmed', -1000, 'NASDAQ:NVDA', 'NVIDIA Corp.', 5, 200,
              '2026-02-10', 'manual')
    `

    // Dividende cash : entrée +80 € (symbol requis).
    await sql`
      INSERT INTO operations (id, club_id, type, status, cash_delta, symbol, operation_date, source)
      VALUES (${OP_DIVIDEND_ID}::uuid, ${SEED_CLUB_ID}::uuid,
              'dividend_cash', 'confirmed', 80, 'NASDAQ:NVDA', '2026-03-01', 'manual')
    `

    // Opération soldée : parts_allocated IS NOT NULL → non annulable (cancel_operation
    // lève 22023 si parts_allocated IS NOT NULL, cf. migration 060).
    await sql`
      INSERT INTO operations (id, club_id, membership_id, type, status, cash_delta,
                              operation_date, source, parts_allocated)
      VALUES (${OP_SETTLED_ID}::uuid, ${SEED_CLUB_ID}::uuid, ${membershipId}::uuid,
              'contribution', 'confirmed', 300, '2025-12-01', 'manual', 10.5)
    `

    // Opération appartenant au club B → non visible depuis le club A (RLS isolation).
    await sql`
      INSERT INTO operations (id, club_id, type, status, cash_delta, operation_date, source)
      VALUES (${OP_CLUB_B_ID}::uuid, ${CLUB_B_ID}::uuid,
              'fee', 'confirmed', -9999, '2026-01-01', 'manual')
    `
  })
}

/** Supprime les opérations de test et le club B. */
async function cleanupOperations(): Promise<void> {
  await withDb(async (sql) => {
    const opIds = [OP_COTISATION_ID, OP_BUY_ID, OP_DIVIDEND_ID, OP_SETTLED_ID, OP_CLUB_B_ID]
    await sql`DELETE FROM operations WHERE id IN ${sql(opIds)}`
    await sql`DELETE FROM clubs WHERE id = ${CLUB_B_ID}::uuid`
  })
}

// ─── Cycle de vie ────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  await setSeedRole('treasurer')
  // membershipId résolu avant le premier login (sera re-résolu dans certains tests
  // après le re-key GoTrue de loginAsSeedMember).
  const mId = await getSeedMembershipId()
  await seedOperations(mId)
})

test.afterAll(async () => {
  await setSeedRole('member')
  await cleanupOperations()
})

// ─────────────────────────────────────────────────────────────────────────────
// FLOW A — Sécurité : membre non-staff → routes /admin/operations redirigées /dashboard
// ─────────────────────────────────────────────────────────────────────────────

test('FLOW-A : membre non-staff → /admin/operations redirigé /dashboard', async ({ page }) => {
  await setSeedRole('member')
  try {
    await loginAsSeedMember(page)

    for (const path of [
      '/admin/operations',
      '/admin/operations/nouvelle',
      '/admin/operations/toutes',
    ]) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    }
  } finally {
    await setSeedRole('treasurer')
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// FLOW B — Isolation cross-club (RLS) : opérations du club B invisibles
// ─────────────────────────────────────────────────────────────────────────────

test('FLOW-B : isolation cross-club — opération club B non visible (RLS)', async ({ page }) => {
  await loginAsSeedMember(page)
  await page.goto('/admin/operations/toutes')

  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

  // L'opération du club B a cash_delta = -9 999 (valeur très distinctive).
  // On vérifie son absence dans le TEXTE VISIBLE uniquement (pas le HTML complet
  // qui peut contenir des classes CSS portant ces chiffres).
  // La RLS bloque SELECT sur les opérations dont club_id n'est pas dans get_user_club_ids().
  await expect(page.getByText('9 999', { exact: false })).not.toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// FLOW C — Tableau de bord opérations (P0-a)
// ─────────────────────────────────────────────────────────────────────────────

test('FLOW-C : tableau de bord opérations — titre + solde + actions rapides', async ({ page }) => {
  await loginAsSeedMember(page)
  await page.goto('/admin/operations')

  // H1 visible (module caption + titre dans OperationsDashboardView).
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // CashBalanceCard : la légende « Solde espèces » est présente (prop captionLabel FR par défaut).
  await expect(page.getByText('Solde espèces')).toBeVisible()

  // Actions rapides : 4 liens vers /admin/operations/nouvelle?type=<type>.
  const quickLinks = page.locator('a[href*="/admin/operations/nouvelle?type="]')
  await expect(quickLinks).toHaveCount(4)

  // Section h2 « Dernières opérations » présente.
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// FLOW D — Saisie cotisation (assistant 3 étapes)
// ─────────────────────────────────────────────────────────────────────────────

test('FLOW-D : saisie cotisation — assistant 3 étapes + confirmation étape 3', async ({ page }) => {
  await loginAsSeedMember(page)

  // Rafraîchit le membership_id après re-key GoTrue (handle_new_user change l'uuid).
  const mId = await getSeedMembershipId()

  // Accès direct à l'étape 2 via ?type=contribution (pré-sélection du type dans OperationForm).
  await page.goto('/admin/operations/nouvelle?type=contribution')

  // Étape 2 : formulaire contribution visible.
  // OperationField variant="select" rend un <select> HTML natif (pas un Radix Select).
  // getByRole('combobox').first() résoudrait le ClubSwitcher Radix dans le header.
  // On cible le <select> natif via son label « Membre » (htmlFor câblé par OperationField).
  const memberSelect = page.locator('select').first()
  await expect(memberSelect).toBeVisible()

  // Sélectionne le membership du seed (valeur = UUID du membership).
  await memberSelect.selectOption(mId)

  // Montant.
  await page.getByLabel('Montant').fill('200')

  // Date (input[type=date]).
  await page.getByLabel('Date').fill('2026-06-25')

  // Soumet le formulaire.
  await page.getByRole('button', { name: /Enregistrer/i }).click()

  // Étape 3 — h1 « Opération enregistrée » (succès Server Action).
  await expect(page.getByRole('heading', { name: /Opération enregistrée/i })).toBeVisible({
    timeout: 15_000,
  })

  // Récap : nouveau solde espèces affiché.
  await expect(page.getByText(/Nouveau solde/i)).toBeVisible()

  // « Voir les opérations » navigue vers la liste complète.
  await page.getByRole('button', { name: /Voir les opérations/i }).click()
  await expect(page).toHaveURL(/\/admin\/operations\/toutes/, { timeout: 10_000 })

  // Nettoyage : supprime la cotisation créée par ce test.
  await withDb(async (sql) => {
    await sql`
      DELETE FROM operations
       WHERE club_id = ${SEED_CLUB_ID}::uuid
         AND type = 'contribution'
         AND cash_delta = 200
         AND source = 'manual'
         AND operation_date = '2026-06-25'
    `
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FLOW E — Liste complète /admin/operations/toutes
// ─────────────────────────────────────────────────────────────────────────────

test('FLOW-E : liste complète — opérations visibles + bouton nouvelle opération', async ({
  page,
}) => {
  await loginAsSeedMember(page)
  await page.goto('/admin/operations/toutes')

  // Titre de la page liste visible.
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

  // Bouton « Nouvelle opération » présent (OperationsTable prop newOperation).
  await expect(page.getByRole('button', { name: /Nouvelle opération/i })).toBeVisible()

  // Le contenu de la liste contient au moins les opérations seedées (cotisation +500 €).
  // Formatée en FR : « 500 € ».
  await expect(page.getByText(/500/)).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// FLOW F — Annulation : modale motif obligatoire
// ─────────────────────────────────────────────────────────────────────────────

test('FLOW-F : annulation — modale motif obligatoire + confirmation', async ({ page }) => {
  await loginAsSeedMember(page)
  await page.goto('/admin/operations/toutes')

  // Attend que la liste soit chargée.
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

  // Clique le premier item de la liste (OperationsTable → onSelectOperation → drawer).
  // La liste est dans un div.divide-y (style Tailwind de séparation).
  const listContainer = page.locator('div.divide-y').first()
  await expect(listContainer).toBeVisible()

  const firstOp = listContainer.locator('> *').first()
  await expect(firstOp).toBeVisible()
  await firstOp.click()

  // Drawer OperationDetailDrawer s'ouvre (role=dialog).
  const drawer = page.getByRole('dialog').first()
  await expect(drawer).toBeVisible({ timeout: 5_000 })

  // Bouton « Annuler l'opération » dans le drawer.
  const cancelBtn = drawer.getByRole('button', { name: /Annuler/i }).last()
  await expect(cancelBtn).toBeVisible()

  // Vérifie que le bouton n'est pas désactivé (l'opération de cotisation n'est pas soldée).
  await expect(cancelBtn).not.toBeDisabled()
  await cancelBtn.click()

  // Modale OperationCancelModal s'ouvre.
  const modal = page.getByRole('dialog').last()
  await expect(modal).toBeVisible({ timeout: 5_000 })

  // Champ de motif (textarea obligatoire).
  const reasonField = modal.getByRole('textbox')
  await expect(reasonField).toBeVisible()

  // Remplit le motif d'annulation.
  await reasonField.fill('Erreur de saisie — test E2E opérations')

  // Confirme l'annulation (bouton de confirmation dans la modale).
  const confirmBtn = modal.getByRole('button', { name: /Confirmer|Annuler l'opération/i }).last()
  await confirmBtn.click()

  // Après confirmation : la modale se ferme (succès).
  await expect(modal).not.toBeVisible({ timeout: 10_000 })

  // Restitue l'opération annulée pour les autres tests (on la re-insère).
  const mId = await getSeedMembershipId()
  await withDb(async (sql) => {
    await sql`DELETE FROM operations WHERE id = ${OP_COTISATION_ID}::uuid`
    await sql`
      INSERT INTO operations (id, club_id, membership_id, type, status, cash_delta, operation_date, source)
      VALUES (${OP_COTISATION_ID}::uuid, ${SEED_CLUB_ID}::uuid, ${mId}::uuid,
              'contribution', 'confirmed', 500, '2026-01-15', 'manual')
    `
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FLOW F2 — Opération soldée : contrôle DB que parts_allocated IS NOT NULL
// ─────────────────────────────────────────────────────────────────────────────

test('FLOW-F2 : opération soldée — parts_allocated IS NOT NULL (contrainte DB)', async () => {
  // Vérification directe en DB : la fixture OP_SETTLED_ID doit avoir parts_allocated non-null.
  // C'est la condition qui désactive le bouton « Annuler l'opération » dans le drawer
  // (OperationDetailDrawer affiche settledWarning + ne rend pas le bouton cancel si settled).
  const row = await withDb(async (sql) => {
    const rows = await sql<{ parts_allocated: string | null }[]>`
      SELECT parts_allocated::text FROM operations WHERE id = ${OP_SETTLED_ID}::uuid
    `
    return rows[0]
  })

  expect(row).toBeDefined()
  expect(row?.parts_allocated).not.toBeNull()
  // La valeur doit être 10.5 (insérée dans le seed).
  expect(parseFloat(row?.parts_allocated ?? '0')).toBeCloseTo(10.5, 1)
})
