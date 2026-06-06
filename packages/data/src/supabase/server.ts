import { createServerClient as createSsrServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

type CookieStore = {
  getAll: () => { name: string; value: string }[]
  set?: (name: string, value: string, options?: CookieOptions) => void
}

/**
 * Client Supabase serveur (anon key + session via cookies Next.js). RLS appliquée.
 *
 * NOTE : SUPABASE_SERVICE_ROLE_KEY n'est PAS utilisée ici — réservée à l'Edge Function
 * `sync` (server-only, supabase/functions/). Le client Next.js server utilise l'anon key
 * avec la session cookie afin que toutes les policies RLS s'appliquent correctement.
 * Déviation intentionnelle par rapport au ticket SHE-003, documentée dans CLAUDE.md.
 */
export function createServerClient(cookieStore: CookieStore) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes.')
  }
  return createSsrServerClient(url, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) => {
        toSet.forEach(({ name, value, options }) => cookieStore.set?.(name, value, options))
      },
    },
  })
}
