/**
 * Client Supabase pour le middleware Next.js.
 *
 * Crée un `createServerClient` capable de lire et d'écrire les cookies
 * de session sur la `NextRequest` et la `NextResponse` courantes.
 * Utilise `getUser()` (revalidé côté serveur) et non `getSession()`.
 *
 * Réf : ARCHITECTURE.md §1, AUT-005.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (
          toSet: { name: string; value: string; options: CookieOptions }[],
          headers: Record<string, string>
        ) => {
          // Propager les cookies rafraîchis sur la request (pour les prochains appels
          // dans la même passe middleware) puis créer une nouvelle response avec eux.
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          // Propager les headers anti-cache émis par @supabase/ssr (Cache-Control, etc.)
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
        },
      },
    }
  )

  return { supabase, response: () => response }
}
