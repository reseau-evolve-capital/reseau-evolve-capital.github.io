/**
 * Helpers E2E partagés (DSH-010).
 *
 * Réutilise le pattern d'auth de `auth.spec.ts` (AUT-009) : on génère un magic link
 * via l'API admin GoTrue (generate_link), ce qui crée/confirme le user dans auth.users
 * et déclenche handle_new_user (rattachement de public.users par email). Le hashed_token
 * renvoyé se vérifie ensuite côté app via `/login/verify?token_hash=…&type=email`.
 *
 * NB clés : le CLI Supabase récent expose une « secret key » (sb_secret_…) plutôt que
 * le JWT service_role historique. Les deux fonctionnent sur l'API admin ; on lit
 * SUPABASE_SERVICE_ROLE_KEY (peut contenir l'une ou l'autre).
 */

import { type Page, request as pwRequest } from '@playwright/test'
import postgres from 'postgres'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

/** Membre de seed (cf. supabase/seed.sql) — invité, club « Club E2E ». */
export const SEED_EMAIL = 'test@example.com'

/**
 * Génère un magic link admin et retourne le hashed_token vérifiable via verifyOtp(type:'email').
 */
export async function generateMagicLink(email: string = SEED_EMAIL): Promise<string> {
  const ctx = await pwRequest.newContext()
  try {
    const res = await ctx.post(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'content-type': 'application/json',
      },
      data: { type: 'magiclink', email },
    })
    const body = (await res.json()) as {
      properties?: { hashed_token?: string }
      hashed_token?: string
    }
    const token = body.properties?.hashed_token ?? body.hashed_token
    if (!token) {
      throw new Error(`generate_link a échoué : ${JSON.stringify(body)}`)
    }
    return token
  } finally {
    await ctx.dispose()
  }
}

/**
 * Authentifie la `page` comme le membre de seed et la pose sur une route déjà chargée.
 * Le seed a `onboarding_completed=false` (réinitialisé par global-setup), donc le premier
 * verify atterrit sur /onboarding/step-1.
 *
 * On NE traverse PAS l'onboarding ici (couvert par auth.spec.ts) : ces specs ciblent
 * l'espace membre (dashboard, portefeuille, etc.). Depuis A1, le middleware redirige TOUT
 * membre non-onboardé vers /onboarding/step-1 à chaque requête protégée. On marque donc
 * l'onboarding terminé EN DB juste après login (clé email : le re-key handle_new_user a
 * déjà changé public.users.id), puis on charge le dashboard directement.
 */
export async function loginAsSeedMember(page: Page): Promise<void> {
  const token = await generateMagicLink(SEED_EMAIL)
  await page.goto(`/login/verify?token_hash=${token}&type=email`)
  // verify (route handler serveur) pose la session puis route le user. Le membre de seed
  // n'étant pas onboardé, il atterrit sur /onboarding/step-1 ; on attend d'avoir quitté /login/verify.
  await page.waitForURL((url) => !url.pathname.startsWith('/login/verify'), { timeout: 20_000 })

  // Marquer l'onboarding terminé (sinon le guard A1 renvoie sur /onboarding à chaque navigation).
  // Par email : handle_new_user a re-keyé public.users.id sur l'UUID GoTrue runtime.
  // member_quote_part est désormais une VUE (migration 030), recalculée à chaque requête et
  // qui suit la cascade de re-key user_id : aucun REFRESH nécessaire pour que le RSC du
  // dashboard ait des données.
  await completeOnboardingFor(SEED_EMAIL)

  // Charger le dashboard : la session + l'onboarding terminé autorisent l'accès.
  await page.goto('/dashboard')
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
}

/** Marque onboarding_completed=true pour un membre (par email, clé stable au re-key). */
export async function completeOnboardingFor(email: string = SEED_EMAIL): Promise<void> {
  const sql = postgres(DB_URL, { max: 1 })
  try {
    await sql`UPDATE public.users SET onboarding_completed = true WHERE email = ${email}`
  } finally {
    await sql.end()
  }
}
