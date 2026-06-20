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
import { isStaffRole, type AdminContext, type MemberRole } from '@/lib/data/admin'
import { resolveNetworkContext, type NetworkContext } from '@/lib/data/network'

/** Nom du cookie de préférence de club actif (posé par setActiveClub, lu côté RSC + UI). */
export const ACTIVE_CLUB_COOKIE = 'evolve_active_club'

/** Lit le club actif préféré depuis le cookie (null si absent). Source unique pour le scoping. */
export async function getActiveClubId(): Promise<string | null> {
  return (await cookies()).get(ACTIVE_CLUB_COOKIE)?.value ?? null
}

export interface SessionUser {
  id: string
  email: string | null
}

/** Adhésion active la plus récente + club joint (carte CLUB ACTIF + statut sync). */
export interface ActiveClubMembership {
  club_id: string
  /** Rôle de l'utilisateur DANS le club actif (source de vérité pour les surfaces role-aware). */
  role: MemberRole
  clubs: { name: string; city: string | null; synced_at: string | null; currency: string } | null
}

/** Une adhésion active listée pour le ClubSwitcher. */
export interface ClubMembershipSummary {
  club_id: string
  name: string
  city: string | null
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
    const preferredClubId = await getActiveClubId()

    // Si un cookie de préférence est présent, on tente d'abord de renvoyer ce club —
    // à condition que l'utilisateur ait bien une adhésion active dessus (sinon fallback).
    if (preferredClubId) {
      const { data: preferred } = await supabase
        .from('memberships')
        .select('club_id, role, clubs(name, city, synced_at, currency)')
        .eq('user_id', userId)
        .eq('club_id', preferredClubId)
        .eq('is_active', true)
        .maybeSingle<ActiveClubMembership>()
      if (preferred) return preferred
    }

    // Fallback : adhésion active la plus récente (comportement V0).
    const { data } = await supabase
      .from('memberships')
      .select('club_id, role, clubs(name, city, synced_at, currency)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle<ActiveClubMembership>()
    return data ?? null
  }
)

/**
 * Toutes les adhésions ACTIVES du membre (pour le ClubSwitcher). Mémoïsée par requête.
 * Renvoie une liste vide si aucune adhésion — jamais throw.
 */
export const getUserClubMemberships = cache(
  async (userId: string): Promise<ClubMembershipSummary[]> => {
    const supabase = await requestClient()
    const { data } = await supabase
      .from('memberships')
      .select('club_id, clubs(name, city)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })
    if (!data) return []
    const result: ClubMembershipSummary[] = []
    for (const row of data) {
      // row.clubs peut être un objet ou un tableau selon la jointure Supabase —
      // on normalise défensivement.
      const raw = row.clubs
      const club = Array.isArray(raw)
        ? (raw[0] as { name: string; city: string | null } | undefined)
        : (raw as { name: string; city: string | null } | null)
      if (!club) continue
      result.push({ club_id: row.club_id, name: club.name, city: club.city })
    }
    return result
  }
)

/**
 * Contexte admin (club + rôle staff) **scopé au club actif**, mémoïsé par requête.
 *
 * Dérivé de `getActiveClubMembership` (même club que le reste du chrome) : on renvoie un
 * contexte UNIQUEMENT si l'utilisateur est trésorier+ dans le club actuellement sélectionné.
 * Sur un club où il est simple membre → `null` → les surfaces admin disparaissent. C'est ce
 * qui faisait que les vues role-aware ne changeaient pas au switch de club (cookie ignoré).
 */
export const getAdminContext = cache(async (userId: string): Promise<AdminContext | null> => {
  const active = await getActiveClubMembership(userId)
  if (!active || !isStaffRole(active.role)) return null
  return { userId, clubId: active.club_id, role: active.role }
})

/**
 * Contexte réseau (rôle global + titre) mémoïsé par requête : le layout /reseau ET la nav
 * du layout (app) (item « Réseau » role-aware) partagent ainsi UNE seule lecture par navigation.
 * Null si le user n'appartient pas à l'équipe réseau (cf. lib/data/network.ts, migration 040).
 */
export const getNetworkContext = cache(async (userId: string): Promise<NetworkContext | null> => {
  const supabase = await requestClient()
  return resolveNetworkContext(supabase, userId)
})
