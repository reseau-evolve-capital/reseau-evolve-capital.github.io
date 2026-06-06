/**
 * global-setup.ts — Réinitialisation idempotente de la fixture E2E avant chaque run (AUT-009).
 *
 * Problème : le test 3 (flow complet) appelle generate_link, ce qui crée un auth.users
 * et déclenche handle_new_user — le trigger re-keye public.users.id sur le nouvel id auth
 * et pose onboarding_completed=true en fin d'onboarding. Au run suivant, le user atterrit
 * sur /dashboard au lieu de /onboarding/step-1 → test 3 échoue.
 *
 * Solution : avant le run, on :
 *   1. Supprime la ligne auth.users (efface le compte GoTrue ; la session est invalide).
 *   2. Re-keye public.users.id vers l'UUID de seed et remet onboarding_completed=false.
 *      La FK memberships.user_id ON UPDATE CASCADE suit automatiquement.
 *
 * Pas besoin de `supabase db reset` : ce setup est chirurgical et rapide (~20 ms).
 */

import postgres from 'postgres'

const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const SEED_USER_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
const SEED_CLUB_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const TEST_EMAIL = 'test@example.com'

export default async function globalSetup() {
  const sql = postgres(DB_URL, { max: 1 })

  try {
    // 1. Supprimer le compte GoTrue si présent (évite que generate_link réutilise une
    //    session expirée ou un token déjà consommé).
    await sql`DELETE FROM auth.users WHERE email = ${TEST_EMAIL}`

    // 2. Remettre public.users dans l'état seed :
    //    - id redevient l'UUID fixe du seed (la FK memberships CASCADE suit)
    //    - onboarding_completed = false pour que le test 3 atterrisse sur step-1
    await sql`
      UPDATE public.users
         SET id                   = ${SEED_USER_ID}::uuid,
             onboarding_completed = false,
             updated_at           = NOW()
       WHERE email = ${TEST_EMAIL}
    `

    // 3. Garantir une ligne contributions pour le membre de seed (DSH-010).
    //    Sans elle, member_quote_part renvoie des colonnes NULL → le dashboard affiche
    //    l'état empty et les specs dashboard n'ont pas de DashboardView à piloter.
    //    On pose des valeurs réalistes (synced il y a 10 min → état « frais », pas stale).
    await sql`
      INSERT INTO contributions (
        membership_id, club_id, months_count, detention_pct, total_contributed,
        net_market_value, status, amount_due, synced_at
      )
      SELECT m.id, ${SEED_CLUB_ID}::uuid, 12, 0.1234, 8000,
             12345.67, 'ok', 0, NOW() - INTERVAL '10 minutes'
        FROM memberships m
       WHERE m.user_id = ${SEED_USER_ID}::uuid AND m.club_id = ${SEED_CLUB_ID}::uuid
      ON CONFLICT (membership_id) DO UPDATE
         SET net_market_value = EXCLUDED.net_market_value,
             detention_pct    = EXCLUDED.detention_pct,
             total_contributed = EXCLUDED.total_contributed,
             status           = EXCLUDED.status,
             amount_due       = EXCLUDED.amount_due,
             synced_at        = NOW() - INTERVAL '10 minutes',
             updated_at       = NOW()
    `

    // 4. member_quote_part est désormais une VUE simple (security_invoker, migration 030),
    //    recalculée à chaque requête : aucun REFRESH nécessaire. (L'ancien REFRESH MATERIALIZED
    //    VIEW échouait depuis la conversion en vue — la fixture n'a plus à le faire.)
  } finally {
    await sql.end()
  }
}
