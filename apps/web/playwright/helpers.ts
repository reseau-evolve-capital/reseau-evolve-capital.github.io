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
 * verify atterrit sur /onboarding/step-1. On force l'accès direct au dashboard ensuite :
 * une fois la session GoTrue posée (cookies), `/dashboard` est servi par le middleware.
 *
 * On NE traverse PAS l'onboarding ici (couvert par auth.spec.ts) : pour le dashboard,
 * la session suffit. On marque l'onboarding terminé en amont via global-setup n'est pas
 * possible (il remet false) ; on s'appuie donc sur le fait que le middleware autorise
 * /dashboard dès qu'une session valide existe, indépendamment de onboarding_completed
 * (la redirection onboarding ne concerne que l'absence de session ou un user non invité).
 */
export async function loginAsSeedMember(page: Page): Promise<void> {
  const token = await generateMagicLink(SEED_EMAIL)
  await page.goto(`/login/verify?token_hash=${token}&type=email`)
  // verify pose la session puis route le user. On attend d'avoir quitté /login/verify.
  await page.waitForURL((url) => !url.pathname.startsWith('/login/verify'), { timeout: 20_000 })

  // generate_link déclenche handle_new_user : public.users.id est re-keyé sur l'UUID GoTrue
  // runtime (la FK memberships CASCADE suit). La vue matérialisée member_quote_part, rafraîchie
  // au global-setup sur l'UUID de seed, ne reflète alors plus l'id courant → le RSC du dashboard
  // verrait un état empty. On la rafraîchit ici pour que `initialData` (RSC) soit non-null.
  await refreshQuotePartView()
}

/** Rafraîchit la vue matérialisée member_quote_part (post-login, voir loginAsSeedMember). */
export async function refreshQuotePartView(): Promise<void> {
  const sql = postgres(DB_URL, { max: 1 })
  try {
    await sql`REFRESH MATERIALIZED VIEW member_quote_part`
  } finally {
    await sql.end()
  }
}
