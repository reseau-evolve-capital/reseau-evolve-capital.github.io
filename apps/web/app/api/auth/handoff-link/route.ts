// Endpoint POST /api/auth/handoff-link — « relais d'appareil » PWA (iOS).
//
// Cas d'usage : un membre déjà connecté sur iPhone-Chrome veut installer la PWA, ce qui
// n'est possible que depuis Safari. Or Safari est un autre navigateur → aucune session.
// On frappe une URL de connexion PORTABLE à usage unique pour l'utilisateur COURANT ; le
// client la copie dans le presse-papiers, et la coller dans Safari l'authentifie.
//
// Pourquoi pas le magic link nominal ? Le flux nominal est PKCE (signInWithOtp) : son
// `code` est lié au navigateur d'origine (cookie `code_verifier`) et ne fonctionnerait pas
// d'un navigateur à l'autre. On RÉUTILISE donc le chemin OTP portable déjà éprouvé pour les
// invitations (/login/invite) : `admin.generateLink('magiclink')` produit un `hashed_token`
// qui se vérifie côté /login/verify via `verifyOtp` (type 'email') — sans cookie, donc
// portable d'un navigateur à l'autre. Le marqueur `?pwa=ios` est propagé jusqu'au dashboard
// pour y proposer l'installation à l'arrivée dans Safari.
//
// Garde-fous : la session de l'appelant est la garde primaire (on ne frappe un lien que pour
// SOI-MÊME, jamais pour un email arbitraire). Réponse jamais cachée (no-store : c'est un
// credential). POST uniquement — pas de GET (un GET frapperait un credential).
//
// Réf : /login/invite/route.ts (recette OTP portable), /login/verify/route.ts (verifyOtp),
// CLAUDE.md (service-role server-only, conventions auth), MEMORY pwa-001-install-banner.

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@evolve/data'

import { siteOrigin } from '@/lib/invitations/token'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(): Promise<NextResponse> {
  // 1. Session de l'appelant (anon + cookies → RLS) : on ne frappe un lien que pour SOI.
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  // 2. Rate limit : 10 req / 5 min par user (anti-rafale de mint ; fail-open si Upstash absent).
  const rl = await checkRateLimit('handoff', user.id)
  if (!rl.allowed) {
    return rateLimitedResponse(rl.retryAfterSeconds)
  }

  // 3. Mint d'un lien magique (admin/service-role) pour CET email — son hashed_token est portable.
  const admin = createServiceRoleClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
  })

  const hashed = data?.properties?.hashed_token
  if (error || !hashed) {
    // Log server-only — on ne fuite jamais le détail au client (credential / surface d'attaque).
    console.error('handoff-link: échec generateLink', error?.message ?? 'hashed_token absent')
    return NextResponse.json({ error: 'mint_failed' }, { status: 500 })
  }

  // 4. URL portable vers /login/verify : verifyOtp type 'email' (≠ PKCE), + marqueur pwa=ios.
  const url = new URL('/login/verify', siteOrigin())
  url.searchParams.set('token_hash', hashed)
  url.searchParams.set('type', 'email')
  url.searchParams.set('pwa', 'ios')

  return NextResponse.json({ url: url.toString() }, { headers: { 'Cache-Control': 'no-store' } })
}
