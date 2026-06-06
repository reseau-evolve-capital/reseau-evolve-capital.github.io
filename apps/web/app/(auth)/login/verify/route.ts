// GET /login/verify — callback du lien de connexion (magic link & invitation).
//
// L'échange du token se fait UNE SEULE FOIS, CÔTÉ SERVEUR (idempotent, pas d'effet
// client réexécutable par StrictMode/prefetch). Deux flux atterrissent ici :
//
//   1. Magic link nominal (signInWithOtp, flux PKCE Supabase) → Supabase redirige vers
//      /login/verify?code=<auth_code>. On échange via exchangeCodeForSession(code) : le
//      cookie code_verifier (posé au signInWithOtp côté serveur) est relu ici.
//   2. Invitation (ADM-007 — admin.generateLink('magiclink')) → /login/verify?token_hash=…&type=…
//      &invited=1. On vérifie via verifyOtp({ token_hash, type }).
//
// Après pose de session : redirige vers /dashboard (flux nominal) ou /onboarding/step-1?invited=1
// (invitation). Le guard onboarding A1 du middleware est l'UNIQUE source de vérité : si
// l'inscription n'est pas terminée, il re-route /dashboard → /onboarding/step-1. Échec/lien
// expiré → /login/verify/expired (écran brandé FR/EN), jamais de page blanche ni de boucle d'effet.
//
// Réf : AUT-005, ADM-007, CLAUDE.md (conventions auth, jamais d'écran vide).

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@evolve/data'

export const runtime = 'nodejs'

// L'origin ne doit JAMAIS provenir d'un header attaquant-contrôlé (open-redirect).
function origin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
}

// Le flux invitation génère un lien via admin.generateLink({ type: 'magiclink' }) dont le
// hashed_token se vérifie avec type 'email' (recette éprouvée). Le flux nominal passe par
// ?code (PKCE) et n'utilise pas ce type.
function resolveOtpType(t: string | null): 'email' | 'magiclink' {
  return t === 'magiclink' ? 'magiclink' : 'email'
}

function expired(): Response {
  return NextResponse.redirect(new URL('/login/verify/expired', origin()))
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const otpType = url.searchParams.get('type')
  const invited = url.searchParams.get('invited') === '1'

  // Supabase renvoie ?error=…&error_code=… quand le lien est déjà consommé ou expiré.
  if (url.searchParams.get('error')) return expired()
  if (!code && !tokenHash) return expired()

  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return expired()
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: resolveOtpType(otpType),
    })
    if (error) return expired()
  }

  // Session posée. On NE décide PAS ici de la redirection onboarding : c'est le guard A1
  // du middleware qui en est l'unique source de vérité (évite toute divergence). On vise
  // /dashboard ; le middleware re-route vers /onboarding/step-1 si l'inscription n'est pas
  // terminée. Cas invitation : on entre directement dans l'onboarding avec l'accueil dédié
  // (?invited=1) — le membre invité n'est jamais onboardé à ce stade.
  const destination = invited ? '/onboarding/step-1?invited=1' : '/dashboard'
  return NextResponse.redirect(new URL(destination, origin()))
}
