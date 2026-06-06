import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types.gen'

/**
 * Client Supabase SERVICE ROLE — **server-only**. Bypass RLS + accès `auth.admin`.
 *
 * Réservé aux chemins server-only strictement nécessaires où la session utilisateur
 * n'existe pas encore (ex. ADM-007 : génération d'un lien d'invitation puis `generateLink`
 * pour ouvrir la session de l'invité). Le reste de l'app utilise `createServerClient`
 * (anon + cookies → RLS appliquée). JAMAIS importé depuis du code browser ; la clé
 * `SUPABASE_SERVICE_ROLE_KEY` n'est jamais exposée au client.
 *
 * Réf : CLAUDE.md (service-role server-only), ADM-007-PLAN.md §Token d'invitation.
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquantes (server-only).'
    )
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
