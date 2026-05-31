/**
 * Middleware Next.js — protection des routes membres (AUT-005).
 *
 * Règles :
 * - /login/* : accessible sans session (le lien magique /login/verify doit fonctionner).
 *   Si l'utilisateur est déjà connecté et accède à /login → redirect /dashboard.
 * - Routes protégées (/dashboard, /portfolio, /contributions, /onboarding, /admin) :
 *   session obligatoire, sinon redirect /login.
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

const PROTECTED_PREFIXES = ['/dashboard', '/portfolio', '/contributions', '/onboarding', '/admin']

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

  // /login/* : si session active → rediriger vers le dashboard.
  // Le /login/verify (callback magic link) reste accessible sans session.
  if (pathname.startsWith('/login') && user) {
    return redirectWithCookies(new URL('/dashboard', request.url), response())
  }

  // Routes protégées : session obligatoire.
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !user) {
    return redirectWithCookies(new URL('/login', request.url), response())
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
