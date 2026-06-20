import { expect, test } from '@playwright/test'
import { loginAsSeedMember } from './helpers.ts'

/**
 * FLOW-015 — Vote anonyme (parcours membre).
 *
 * Couvre le flux irréversible « découvrir → voter → résultats » (cf. docs/qa/FLOWS.md).
 * S'appuie sur le seed `supabase/seed.sql` : les votes vivent dans le club dédié
 * « Club Votes E2E » (`eeee…001`), 4 votes ouverts dont `POLL_YESNO` en `live` + 1 clôturé.
 * Le membre de seed appartient à ce club ET au club E2E (`aaaa`) ; son club actif par défaut
 * est `aaaa` (joined_at plus récent). Comme la page /votes scope au CLUB ACTIF
 * (getMemberPolls), on bascule explicitement le club actif sur le club des votes via le
 * cookie `evolve_active_club`. `global-setup` purge les `poll_responses` du membre de seed
 * avant chaque run → le membre démarre toujours « n'a pas encore voté ».
 *
 * Anonymat : la vue résultats expose des agrégats, jamais d'identité (la RPC
 * `get_poll_results` SECURITY DEFINER ne renvoie pas `user_id`). On vérifie qu'aucun UUID
 * de réponse n'apparaît à l'écran.
 */

const POLL_YESNO = 'dddddddd-0000-0000-0000-000000000001' // yes_no · live
const VOTES_CLUB = 'eeeeeeee-0000-0000-0000-000000000001' // « Club Votes E2E » — club des votes seedés

test.describe('FLOW-015 · vote anonyme (membre)', () => {
  test('bannière dashboard → page /votes → voter → résultats live', async ({ page }) => {
    await loginAsSeedMember(page)

    // Bascule le club actif sur le club des votes (la page /votes scope au club actif).
    await page.context().addCookies([
      {
        name: 'evolve_active_club',
        value: VOTES_CLUB,
        url: new URL(page.url()).origin,
        sameSite: 'Lax',
        secure: false,
      },
    ])

    // 1. Découverte : bannière de vote sur le dashboard (≥2 votes → variante agrégée).
    const banner = page.getByText(/votes? en attente de votre réponse/i)
    await expect(banner).toBeVisible()

    // 2. Page /votes : onglet « En cours » + au moins une carte à voter.
    await page.goto('/votes')
    await expect(page.getByRole('tab', { name: 'En cours' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Voter' }).first()).toBeVisible()

    // 3. Détail du vote yes_no (live) : la modale de vote s'ouvre, badge anonyme + options.
    await page.goto(`/votes/${POLL_YESNO}`)
    await expect(page.getByText('Vote anonyme')).toBeVisible()
    const group = page.getByRole('radiogroup')
    await expect(group).toBeVisible()

    // Submit désactivé tant qu'aucune option n'est choisie (contrat PollVoteSheet).
    const confirm = page.getByRole('button', { name: /Confirmer mon vote/i })
    await expect(confirm).toBeDisabled()

    // 4. Voter « Oui » → confirmer.
    await page.getByRole('radio', { name: 'Oui' }).click()
    await expect(confirm).toBeEnabled()
    await confirm.click()

    // 5. Résultats live visibles après le vote (badge + participation agrégée).
    await expect(page.getByText('Résultats', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/membres ont voté/i)).toBeVisible()

    // 6. Anonymat : aucun UUID (donc aucun user_id de réponse) rendu dans la vue résultats.
    const main = await page.getByRole('main').innerText()
    expect(main).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)

    // 7. Vote définitif (UNIQUE poll_id,user_id) : re-visiter le vote retombe sur les
    //    résultats, jamais sur la modale de vote.
    await page.goto(`/votes/${POLL_YESNO}`)
    await expect(page.getByText('Résultats', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /Confirmer mon vote/i })).toHaveCount(0)
  })
})
