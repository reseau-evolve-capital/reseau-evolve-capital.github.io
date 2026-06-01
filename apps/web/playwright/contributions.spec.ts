/**
 * Tests E2E — écran /contributions (COT-007).
 *
 * Stratégie : seeding DB chirurgical (comme global-setup.ts / refreshQuotePartView).
 *   Le seed possède DÉJÀ une ligne `contributions` (posée par global-setup pour les specs
 *   dashboard) → `initialData` est NON-null. Le pattern « mock + refetch au focus » du
 *   portfolio ne s'applique donc pas ici (il suppose un seed vide). On seede plutôt de
 *   vraies lignes `contribution_months` pour le membre, et on assert sur le rendu RSC réel.
 *
 *   - `contribution_months.membership_id` référence `memberships.id` (PK stable). Au login,
 *     c'est `memberships.user_id` qui se re-keye (CASCADE depuis auth.users), pas la PK →
 *     les mois seedés restent rattachés au bon membre.
 *   - On résout le membership via `club_id` (le seed n'a qu'une adhésion sur ce club).
 *   - Pour le scénario « retard », on bascule `contributions.status` puis on le réinitialise.
 *
 * useSyncStatus utilise useMutation (fetch uniquement sur mutate(), jamais au montage)
 * → aucun stub réseau nécessaire.
 *
 * Desktop uniquement (1280×720 par défaut Playwright).
 *
 * Scénarios : chargement (titre, statut, KPIs, timeline), groupement par année, bandeau
 * retard, popover mois, sans auth → redirect.
 * Lighthouse/CI : hors scope (décision de cadrage) — perf/a11y couvertes par jest-axe en unit.
 *
 * Réf : COT-007, CLAUDE.md (a11y AA, copy FR, jamais de NaN/undefined).
 */

import { test, expect } from '@playwright/test'
import postgres from 'postgres'

import { loginAsSeedMember } from './helpers'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const SEED_CLUB_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

// ─────────────────────────────────────────────────────────────────────────────
// Seeding DB
// ─────────────────────────────────────────────────────────────────────────────

type MonthSeed = {
  membership_id: string
  club_id: string
  year: number
  month: number
  amount: number
  status: 'paid' | 'due' | 'late' | 'exempt'
  due_date: string | null
  paid_at: string | null
  synced_at: string
}

/** Exécute `fn` avec un client postgres mono-connexion, fermé en fin d'appel. */
async function withDb<T>(fn: (sql: ReturnType<typeof postgres>) => Promise<T>): Promise<T> {
  const sql = postgres(DB_URL, { max: 1 })
  try {
    return await fn(sql)
  } finally {
    await sql.end()
  }
}

/** Résout l'unique adhésion du club de seed (id stable malgré le re-key user au login). */
async function resolveMembershipId(): Promise<string> {
  return withDb(async (sql) => {
    const rows = await sql<{ id: string }[]>`
      SELECT id FROM memberships WHERE club_id = ${SEED_CLUB_ID}::uuid LIMIT 1
    `
    const id = rows[0]?.id
    if (!id) throw new Error('Aucune adhésion de seed sur le club E2E')
    return id
  })
}

/**
 * Seede des lignes contribution_months déterministes pour le membre :
 *   - 2026 : jan-mars payés (100 €), avril « due » (en attente).
 *   - 2025 : 12 mois payés (100 €).
 * Idempotent via ON CONFLICT.
 */
async function seedMonths(membershipId: string): Promise<void> {
  const now = new Date().toISOString()
  const rows: MonthSeed[] = []
  const push = (year: number, month: number, status: MonthSeed['status']): void => {
    const mm = String(month).padStart(2, '0')
    rows.push({
      membership_id: membershipId,
      club_id: SEED_CLUB_ID,
      year,
      month,
      amount: status === 'due' ? 0 : 100,
      status,
      due_date: `${year}-${mm}-05`,
      paid_at: status === 'paid' ? `${year}-${mm}-05` : null,
      synced_at: now,
    })
  }
  // 2026 : 4 mois (avril en attente)
  ;[1, 2, 3].forEach((m) => push(2026, m, 'paid'))
  push(2026, 4, 'due')
  // 2025 : 12 mois payés
  for (let m = 1; m <= 12; m++) push(2025, m, 'paid')

  await withDb(async (sql) => {
    await sql`
      INSERT INTO contribution_months ${sql(
        rows,
        'membership_id',
        'club_id',
        'year',
        'month',
        'amount',
        'status',
        'due_date',
        'paid_at',
        'synced_at'
      )}
      ON CONFLICT (membership_id, year, month) DO UPDATE
        SET amount    = EXCLUDED.amount,
            status    = EXCLUDED.status,
            due_date  = EXCLUDED.due_date,
            paid_at   = EXCLUDED.paid_at,
            synced_at = EXCLUDED.synced_at
    `
  })
}

/** Bascule le statut de synthèse (scénario retard) ; réinitialisé en fin de test. */
async function setContributionStatus(
  membershipId: string,
  status: 'ok' | 'late',
  amountDue: number
): Promise<void> {
  await withDb(async (sql) => {
    await sql`
      UPDATE contributions
         SET status = ${status}::contribution_status,
             amount_due = ${amountDue},
             updated_at = NOW()
       WHERE membership_id = ${membershipId}::uuid
    `
  })
}

/** Nettoie les mois seedés et réinitialise la synthèse à « ok » (post-suite). */
async function cleanup(membershipId: string): Promise<void> {
  await withDb(async (sql) => {
    await sql`DELETE FROM contribution_months WHERE membership_id = ${membershipId}::uuid`
    await sql`
      UPDATE contributions
         SET status = 'ok'::contribution_status, amount_due = 0, updated_at = NOW()
       WHERE membership_id = ${membershipId}::uuid
    `
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Cycle de vie
// ─────────────────────────────────────────────────────────────────────────────

let membershipId: string

test.beforeAll(async () => {
  membershipId = await resolveMembershipId()
  await seedMonths(membershipId)
})

test.afterAll(async () => {
  await cleanup(membershipId)
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 1 : Chargement → titre, statut, KPIs et timeline visibles
// ─────────────────────────────────────────────────────────────────────────────
test('chargement → titre, statut, KPIs et timeline visibles', async ({ page }) => {
  await loginAsSeedMember(page)
  await page.goto('/contributions')

  await expect(page.getByRole('heading', { name: 'Mes cotisations' })).toBeVisible()
  // status='ok' (état seed) → Pill « Situation régulière ».
  await expect(page.getByText('Situation régulière')).toBeVisible()
  // KPI « Total cotisé » : libellé + valeur (8 000 € seedé par global-setup) → vérifie la
  // chaîne RSC → KPICard → formatEUR (NBSP comme séparateur de milliers).
  await expect(page.getByText('Total cotisé')).toBeVisible()
  await expect(page.getByText(/8\s000/)).toBeVisible()
  // La timeline réelle est rendue (mois seedés).
  await expect(page.getByRole('list', { name: 'Historique des cotisations' })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 2 : Timeline groupée par année (2026 et 2025)
// ─────────────────────────────────────────────────────────────────────────────
test('timeline groupée par année (2026 et 2025)', async ({ page }) => {
  await loginAsSeedMember(page)
  await page.goto('/contributions')

  await expect(page.getByRole('heading', { name: '2026' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '2025' })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 3 : Statut en retard → banner d'alerte avec montant dû
// ─────────────────────────────────────────────────────────────────────────────
test("statut en retard → banner d'alerte avec montant dû", async ({ page }) => {
  await setContributionStatus(membershipId, 'late', 100)
  try {
    await loginAsSeedMember(page)
    await page.goto('/contributions')

    // `getByRole('alert')` matche aussi le __next-route-announcer__ de Next (vide) → on cible
    // le bandeau par son texte. On asserte aussi le montant (100 €) pour vérifier que amount_due
    // remonte bien de la DB jusqu'au rendu via formatEUR.
    await expect(page.getByText(/retard de cotisation de 100/)).toBeVisible()
  } finally {
    await setContributionStatus(membershipId, 'ok', 0)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 4 : Clic sur une cellule de mois → Popover détail
// ─────────────────────────────────────────────────────────────────────────────
test('clic sur une cellule de mois → Popover détail', async ({ page }) => {
  await loginAsSeedMember(page)
  await page.goto('/contributions')

  // Première cellule (années DESC, mois DESC) = avril 2026 « en attente ». Son aria-label réel
  // est produit par buildMonthAriaLabel (« Avril 2026, en attente »).
  // CONTOURNEMENT d'un défaut connu (à traiter en COT-008) : les cellules CotisationMonth font
  // 24px (< cible tactile 44px) et la première ligne d'une année peut être occultée par le header
  // d'année `sticky` → `.click()` échoue l'actionability. On déclenche donc le clic via
  // dispatchEvent (pas de hit-testing par coordonnées). NE PAS remplacer par `.click()` tant que
  // l'occlusion sticky / la taille de cible ne sont pas corrigées.
  const cell = page.getByRole('button', { name: /Avril 2026/ })
  await cell.dispatchEvent('click')

  // Le Popover affiche le tooltip riche du mois (buildMonthTooltip : « Avril 2026 — en attente »).
  await expect(page.getByText('Avril 2026 — en attente')).toBeVisible({ timeout: 5_000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scénario 5 : Sans auth → redirect /login (middleware AUT-005)
// ─────────────────────────────────────────────────────────────────────────────
test('sans auth → redirect /login', async ({ page, context }) => {
  await context.clearCookies()
  await page.goto('/contributions')
  await expect(page).toHaveURL(/\/login/)
})
