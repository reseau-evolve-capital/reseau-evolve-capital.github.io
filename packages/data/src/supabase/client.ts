import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr'

/** Client Supabase navigateur (anon key). À utiliser uniquement côté client. */
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes.')
  }
  return createSsrBrowserClient(url, anon)
}
