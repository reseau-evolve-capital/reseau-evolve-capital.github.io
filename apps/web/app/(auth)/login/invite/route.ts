// GET /login/invite?token=<clair> — acceptation d'une invitation (ADM-007).
//
// Seul chemin SERVICE-ROLE de la feature (server-only) : l'invité n'a pas encore de session.
//   1. hash du token → RPC accept_invitation (valide pending + non expiré, marque accepted,
//      renvoie l'email). L'allowlist public.users a été garantie à la création de l'invitation.
//   2. generateLink (admin) pour cet email → on réutilise le flux /login/verify existant
//      (verifyOtp côté client pose la session) → onboarding « Vous avez été invité ».
// Échec/expiration → retour /login avec un indicateur (?invite=expired|error), jamais de page blanche.
//
// Réf : ADM-007-PLAN.md §Token d'invitation, migration 016 (accept_invitation), AUT-001.

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@evolve/data'
import { hashInviteToken, siteOrigin } from '@/lib/invitations/token'

export const runtime = 'nodejs'

function backToLogin(reason: 'expired' | 'error'): Response {
  const url = new URL('/login', siteOrigin())
  url.searchParams.set('invite', reason)
  return NextResponse.redirect(url)
}

export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return backToLogin('error')

  const admin = createServiceRoleClient()

  // 1. Valide et consomme l'invitation (RPC SECURITY DEFINER, grant service_role).
  const { data: email, error } = await admin.rpc('accept_invitation', {
    p_token_hash: hashInviteToken(token),
  })
  if (error || !email) return backToLogin('expired')

  // 2. Mint d'un lien magique pour cet email → on route son hashed_token vers /login/verify.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  const hashed = link?.properties?.hashed_token
  if (linkErr || !hashed) return backToLogin('error')

  const verifyUrl = new URL('/login/verify', siteOrigin())
  verifyUrl.searchParams.set('token_hash', hashed)
  verifyUrl.searchParams.set('type', 'magiclink')
  verifyUrl.searchParams.set('invited', '1')
  return NextResponse.redirect(verifyUrl)
}
