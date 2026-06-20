/**
 * Test E2E RÉEL — Assistant « Ajouter un club » contre la vraie matrice Google Sheets.
 *
 * Contrairement à reseau-add-club.spec.ts (mocks, E2E_NETWORK_MOCKS=1), ce spec
 * teste le flux complet SANS mock :
 *   - probeSheet → vraie Edge Function sheet-probe → vraie API Google Sheets
 *   - setClubSheetAction → branchement réel en DB
 *
 * Matrice réelle utilisée : 17ip17J9cnJsh550N1DhNtcXJ3htc3YUdk9WBLLH8I3s
 * Partagée avec : rec-poc@rec-poc-497900.iam.gserviceaccount.com
 *
 * NE PAS poser E2E_NETWORK_MOCKS — le chemin réel doit être exercé.
 *
 * Nettoyage en afterAll : DELETE FROM clubs WHERE slug = <slug_unique> (CASCADE).
 */

import { test, expect, type Page } from '@playwright/test'
import postgres from 'postgres'

import { loginAsSeedMember } from './helpers'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

// Matrice de test réelle (partagée avec le Service Account)
const REAL_SHEET_ID = '17ip17J9cnJsh550N1DhNtcXJ3htc3YUdk9WBLLH8I3s'

// Slug unique par run pour éviter toute collision
const RUN = Date.now().toString(36)
const CLUB_SLUG = `qa-reel-${RUN}`
const CLUB_NAME = `QA Réel ${RUN}`

async function withDb<T>(fn: (sql: ReturnType<typeof postgres>) => Promise<T>): Promise<T> {
  const sql = postgres(DB_URL, { max: 1 })
  try {
    return await fn(sql)
  } finally {
    await sql.end()
  }
}

/** Vérifie en DB que le club a bien été créé avec la matrice branchée. */
async function checkClubInDb(): Promise<
  { name: string; slug: string; sheet_id: string | null } | undefined
> {
  return withDb(async (sql) => {
    const [row] = await sql<{ name: string; slug: string; sheet_id: string | null }[]>`
      SELECT name, slug, sheet_id FROM clubs WHERE slug = ${CLUB_SLUG}
    `
    return row
  })
}

/** Nettoie le club créé par ce test (par slug stable, CASCADE sur memberships/positions). */
async function cleanup(): Promise<void> {
  await withDb(async (sql) => {
    const deleted = await sql<{ id: string }[]>`
      DELETE FROM clubs WHERE slug = ${CLUB_SLUG} RETURNING id
    `
    if (deleted.length > 0) {
      console.log(`[cleanup] Club supprimé : ${deleted[0]?.id} (slug=${CLUB_SLUG})`)
    } else {
      console.log(`[cleanup] Aucun club à supprimer pour slug=${CLUB_SLUG}`)
    }
  })
}

test.afterAll(async () => {
  await cleanup()
})

test('network_admin peut ajouter un club avec une vraie matrice Google Sheets (flux non mocké)', async ({
  page,
}: {
  page: Page
}) => {
  // État propre si un run précédent a laissé ce slug en DB
  await cleanup()

  // ── Login ────────────────────────────────────────────────────────────────
  await loginAsSeedMember(page)

  // ── Étape 1 — Infos du club ───────────────────────────────────────────────
  await page.goto('/reseau/clubs/nouveau')
  await expect(page.getByRole('heading', { name: 'Infos du club' })).toBeVisible({
    timeout: 15_000,
  })

  // Saisir le nom → le slug est auto-dérivé, puis on l'écrase par notre slug unique déterministe
  await page.getByLabel(/^Nom du club/).fill(CLUB_NAME)

  // Attendre que le slug soit auto-rempli, puis l'écraser
  const slugField = page.getByLabel(/^Slug/)
  await slugField.clear()
  await slugField.fill(CLUB_SLUG)

  await page.getByRole('button', { name: 'Continuer' }).click()

  // ── Étape 2 — Connecter la matrice ───────────────────────────────────────
  await expect(page.getByRole('heading', { name: 'Connecter la matrice' })).toBeVisible({
    timeout: 15_000,
  })

  // Saisir l'ID de la vraie matrice Google Sheets
  const matrixField = page.getByLabel('URL ou ID de la feuille Google Sheets')
  await matrixField.fill(REAL_SHEET_ID)

  // Lancer le test de connexion RÉEL (appel Google Sheets via Edge Function)
  await page.getByRole('button', { name: 'Tester la connexion' }).click()

  // Attendre le résultat avec timeout généreux (appel réseau Google réel)
  // Deux cas possibles :
  //   - SUCCÈS : "Connexion réussie" apparaît → le bouton "Continuer" devient actif
  //   - ÉCHEC  : un message d'erreur apparaît → on le capture et on échoue explicitement

  // On attend d'abord que le spinner "Test en cours…" disparaisse
  await expect(page.getByRole('button', { name: 'Tester la connexion' })).toBeVisible({
    timeout: 35_000,
  })

  // Attendre soit le succès soit un message d'erreur (l'un des deux apparaît)
  const successTitle = page.getByText('Connexion réussie')
  const errorTitle = page.getByText(
    /Feuille non partagée|Structure incomplète|Feuille introuvable|Compte de service non configuré|Test impossible/
  )
  const preview = page.getByText(/membres\s*·\s*\d+\s*positions/)

  // On attend l'un des deux avec un timeout généreux (appel Google réel)
  await Promise.race([
    successTitle.waitFor({ state: 'visible', timeout: 35_000 }),
    errorTitle.waitFor({ state: 'visible', timeout: 35_000 }),
  ])

  // Capturer le message d'erreur si le test a échoué
  const hasError = await errorTitle.isVisible()
  if (hasError) {
    const errorText = await errorTitle.textContent()
    // Aussi chercher le corps de l'erreur pour le diagnostic
    const errorBody = page.getByRole('alert')
    const errorBodyText = await errorBody.textContent().catch(() => '(pas de texte alert)')
    // Screenshot pour preuve
    await page.screenshot({
      path: `/private/tmp/claude-501/-Users-lionel-Documents-OMNIVENTUS-Projects-reseau-evolve-capital/0ff6a3d7-77bd-495c-a8a4-bb247d704b7a/scratchpad/sheet-probe-error.png`,
    })
    throw new Error(
      `[ÉCHEC CONNEXION MATRICE] Titre erreur : "${errorText}" | Corps : "${errorBodyText}"`
    )
  }

  // SUCCÈS : vérifier que le titre et l'aperçu sont visibles
  await expect(successTitle).toBeVisible()
  await expect(preview).toBeVisible({ timeout: 5_000 })

  // "Continuer" doit être activé uniquement après un test en succès
  const continueBtn = page.getByRole('button', { name: 'Continuer' })
  await expect(continueBtn).toBeEnabled({ timeout: 5_000 })

  // Cliquer "Continuer" → setClubSheetAction → avance à l'étape 3
  await continueBtn.click()

  // ── Vérification DB avant étape 3 ───────────────────────────────────────
  // Attendre que l'étape 3 soit visible (preuve que setClubSheetAction a réussi)
  await expect(page.getByRole('heading', { name: 'Premier import & responsable' })).toBeVisible({
    timeout: 15_000,
  })

  // Vérifier en DB que le club a été créé avec la matrice branchée
  const dbRow = await checkClubInDb()
  console.log(`[DB check] Club trouvé :`, dbRow)

  // Assertions DB
  expect(dbRow, `Club avec slug=${CLUB_SLUG} introuvable en DB`).toBeTruthy()
  expect(dbRow?.sheet_id, 'sheet_id doit correspondre à la matrice saisie').toBe(REAL_SHEET_ID)
  expect(dbRow?.name, 'Le nom du club doit correspondre').toBe(CLUB_NAME)

  console.log(
    `[PASS] Club "${dbRow?.name}" créé (slug=${dbRow?.slug}) avec matrice sheet_id=${dbRow?.sheet_id}`
  )

  // ── Assertion finale : on est bien à l'étape 3 (flux complet validé) ────
  // Le titre de l'étape 3 visible + le club en DB avec la matrice = SUCCÈS COMPLET
  // On ne teste pas l'import ici (flux déjà couvert par le spec mocké)
  await expect(page.getByRole('heading', { name: 'Premier import & responsable' })).toBeVisible()
})
