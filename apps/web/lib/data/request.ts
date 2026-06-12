// Contexte par-requête des écrans (app) — dédup auth + memberships (fix flash skeleton).
//
// PROBLÈME : chaque navigation (app) payait 2× `auth.getUser()` (réseau Supabase Auth) —
// une fois dans le middleware, une fois dans le layout/la page — PLUS 2-3 lookups
// `memberships` identiques (layout (app) + page + admin layout/page). Cette latence
// serveur par-navigation est une des causes du skeleton systématique sur mobile.
//
// SOLUTION :
//   - `getSessionUser()` : remplace `getUser()` dans les RSC du groupe (app) par
//     `auth.getClaims()` (supabase-js ≥ 2.69, installé 2.106.2). getClaims décode le JWT
//     et VÉRIFIE sa signature LOCALEMENT (WebCrypto + JWKS mis en cache) quand le projet
//     utilise des clés asymétriques ; si l'algo est symétrique (HS256, ex. stack CLI
//     locale), il retombe sur `getUser()` réseau — donc JAMAIS moins sûr qu'avant.
//     C'est sûr ici parce que le middleware (AUT-005) a DÉJÀ revalidé la session via
//     `getUser()` réseau sur CHAQUE requête protégée : les RSC ne font que relire une
//     identité déjà contrôlée en amont. Le middleware, lui, garde son getUser réseau.
//   - `React.cache()` : chaque helper est mémoïsé PAR REQUÊTE (même passe de rendu RSC :
//     layout (app) + layout admin + page partagent le résultat). Les helpers créent leur
//     propre client serveur (cookies() est lui-même mémoïsé par Next) pour que la clé de
//     cache ne dépende que des arguments — pas de l'instance Supabase.
//
// AUCUN service-role ici : tout passe par la RLS de la session courante.

import { cache } from 'react'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { resolveAdminContext, type AdminContext } from '@/lib/data/admin'

export interface SessionUser {
  id: string
  email: string | null
}

/** Adhésion active la plus récente + club joint (carte CLUB ACTIF + statut sync). */
export interface ActiveClubMembership {
  club_id: string
  clubs: { name: string; city: string | null; synced_at: string | null } | null
}

/** Client Supabase serveur lié aux cookies de la requête courante. */
async function requestClient() {
  return createServerClient(await cookies())
}

/**
 * Utilisateur de la session courante, vérifié via `getClaims()` (cf. en-tête de fichier).
 * Mémoïsé par requête : layout (app) + pages + layout admin partagent UNE seule vérification.
 * Retourne null sans session valide (le middleware a normalement déjà redirigé vers /login).
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await requestClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null
  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : null }
})

/**
 * Adhésion active la plus récente du membre (club_id + club joint). Mémoïsée par requête :
 * le layout (app) (carte CLUB ACTIF) et les pages dashboard/portfolio/contributions
 * faisaient chacun ce même lookup — désormais UNE requête par navigation.
 */
export const getActiveClubMembership = cache(
  async (userId: string): Promise<ActiveClubMembership | null> => {
    const supabase = await requestClient()
    const { data } = await supabase
      .from('memberships')
      .select('club_id, clubs(name, city, synced_at)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle<ActiveClubMembership>()
    return data ?? null
  }
)

/**
 * Contexte admin (club + rôle staff) mémoïsé par requête : le layout admin ET chaque
 * page admin appelaient `resolveAdminContext` séparément (2 lookups par navigation).
 */
export const getAdminContext = cache(async (userId: string): Promise<AdminContext | null> => {
  const supabase = await requestClient()
  return resolveAdminContext(supabase, userId)
})
