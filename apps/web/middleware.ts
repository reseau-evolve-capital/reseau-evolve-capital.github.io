/**
 * Middleware Next.js — protection des routes membres (AUT-005).
 *
 * Règles :
 * - /login/* : accessible sans session (le lien magique /login/verify doit fonctionner).
 *   Si l'utilisateur est déjà connecté et accède à /login → redirect /dashboard.
 * - Routes protégées (/dashboard, /portfolio, /contributions, /onboarding, /admin, /profil) :
 *   session obligatoire, sinon redirect /login. Tant que l'onboarding n'est pas terminé,
 *   ces routes (hors /onboarding/*) redirigent vers /onboarding/step-1 (guard A1).
 * - /admin uniquement : le user doit passer user_is_staff() (trésorier, président ou
 *   network_admin dans un club actif), sinon redirect /dashboard.
 *
 * Utilise `getUser()` (revalidé côté serveur Supabase Auth) et non `getSession()`
 * pour éviter d'utiliser un token non vérifié pour des décisions d'autorisation.
 *
 * Réf : ARCHITECTURE.md §1, DATA_MODEL.md (migration 014), AUT-005.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/portfolio',
  '/contributions',
  '/onboarding',
  '/admin',
  '/profil',
]

/**
 * Construit une réponse de redirection en propageant les cookies posés par
 * @supabase/ssr sur `supabaseResponse`.
 *
 * Sans cette copie, si getUser() a déclenché une rotation de token, les nouveaux
 * cookies sont perdus et l'utilisateur se retrouve déconnecté ou dans une boucle
 * de redirections à la prochaine requête.
 */
function redirectWithCookies(url: URL, supabaseResponse: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie)
  })
  return redirect
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabase, response } = createMiddlewareClient(request)

  // Récupère l'utilisateur courant — revalidé côté Supabase Auth (pas juste les cookies).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Racine : pas de page d'accueil membre → on route selon la session
  // (connecté → dashboard, sinon → login). Meilleure UX qu'un placeholder.
  if (pathname === '/') {
    return redirectWithCookies(new URL(user ? '/dashboard' : '/login', request.url), response())
  }

  // /login/* : si session active → rediriger vers le dashboard.
  // Le /login/verify (callback magic link) reste accessible sans session.
  if (pathname.startsWith('/login') && user) {
    return redirectWithCookies(new URL('/dashboard', request.url), response())
  }

  // Routes protégées : session obligatoire.
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !user) {
    return redirectWithCookies(new URL('/login', request.url), response())
  }

  // Verrou d'accès (ADM-007) : un membre dont TOUTES les adhésions actives sont verrouillées
  // est redirigé vers /acces-suspendu — vérifié à CHAQUE requête protégée (pas seulement au login).
  // current_user_access_blocked() est SECURITY DEFINER (migration 016). /acces-suspendu n'étant
  // pas un préfixe protégé, il n'est jamais redirigé ici → pas de boucle.
  if (user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    // Guard onboarding (A1) : tant que l'inscription n'est pas terminée, l'espace membre
    // n'est pas accessible — on force le parcours /onboarding/* à CHAQUE requête protégée
    // (pas seulement juste après le verify : un refresh ou un lien direct doit aussi rediriger).
    // self-read autorisé par la policy « users: self read » (migration 011). Requête légère
    // (une colonne), uniquement sur les routes protégées (jamais sur les publiques/statics).
    //
    // Les 2 lectures (verrou ADM-007 + onboarding) sont indépendantes → parallélisées
    // (ticket C : latence middleware par-navigation). La PRIORITÉ des redirections est
    // préservée : le verrou d'accès est évalué AVANT le guard onboarding.
    const [{ data: blocked }, { data: profile }] = await Promise.all([
      supabase.rpc('current_user_access_blocked'),
      supabase.from('users').select('onboarding_completed').eq('id', user.id).maybeSingle(),
    ])

    if (blocked) {
      return redirectWithCookies(new URL('/acces-suspendu', request.url), response())
    }

    const onOnboarding = pathname.startsWith('/onboarding')
    const onboardingCompleted = profile?.onboarding_completed ?? false

    if (!onboardingCompleted && !onOnboarding) {
      return redirectWithCookies(new URL('/onboarding/step-1', request.url), response())
    }
    // INVERSE : un membre déjà onboardé qui retombe sur /onboarding/* est renvoyé au dashboard
    // (le tour /onboarding/tour reste accessible : c'est une visite guidée, pas une étape d'inscription).
    if (onboardingCompleted && onOnboarding && !pathname.startsWith('/onboarding/tour')) {
      return redirectWithCookies(new URL('/dashboard', request.url), response())
    }
  }

  // /admin uniquement : le user doit être staff (trésorier / président / network_admin).
  // user_is_staff() est une fonction SECURITY DEFINER en DB (migration 014),
  // appelable uniquement par les utilisateurs authentifiés.
  if (pathname.startsWith('/admin') && user) {
    const { data: isStaff } = await supabase.rpc('user_is_staff')
    if (!isStaff) {
      return redirectWithCookies(new URL('/dashboard', request.url), response())
    }
  }

  return response()
}

export const config = {
  matcher: [
    /*
     * Correspond à toutes les routes SAUF :
     * - /api/* — API routes Next.js
     * - /_next/static — assets statiques
     * - /_next/image — optimisation d'images
     * - /favicon.ico
     * - /brand — assets de marque (logos, icônes statiques)
     * - /onboarding/*.svg — SVG d'illustration onboarding
     */
    '/((?!api|_next/static|_next/image|favicon.ico|brand|onboarding/.*\\.svg).*)',
  ],
}
