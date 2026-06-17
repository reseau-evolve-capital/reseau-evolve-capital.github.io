// Couche data du scope RÉSEAU (NET-002).
//
// Le « réseau » est le niveau au-dessus des clubs : un membre réseau (network_admin /
// network_board) pilote la gouvernance inter-clubs (espace /reseau). Ce scope est GLOBAL,
// orthogonal au rôle per-club `member_role` (cf. migration 040) : un membre réseau a au plus
// UNE ligne `network_members` (PK = users.id), indépendante de toute adhésion à un club.
//
// On lit donc `network_members` pour le user courant SANS `.limit(1)` par club (≠ contexte
// admin trésorier qui résout un club). La policy RLS « lecture self ou membre reseau »
// (migration 040) autorise le user à lire sa propre ligne. JAMAIS de service-role ici :
// tout passe par la RLS de la session courante.
//
// Réf : NET-001 (migration 040), lib/data/admin.ts (modèle resolveAdminContext), CLAUDE.md (RLS).

import type { createServerClient, Database } from '@evolve/data'

type ServerClient = ReturnType<typeof createServerClient>
type NetworkMemberRow = Database['public']['Tables']['network_members']['Row']

export type NetworkRole = Database['public']['Enums']['network_role']
export type NetworkTitle = Database['public']['Enums']['network_title']

/** Contexte réseau du user courant : rôle global + titre éventuel. Null si non-membre réseau. */
export interface NetworkContext {
  role: NetworkRole
  title: NetworkTitle | null
}

/**
 * Résout le contexte réseau du user courant. Null si le user n'appartient PAS à l'équipe réseau.
 * Lecture self autorisée par la policy RLS de migration 040 (un user lit sa propre ligne).
 */
export async function resolveNetworkContext(
  supabase: ServerClient,
  userId: string
): Promise<NetworkContext | null> {
  const { data } = await supabase
    .from('network_members')
    .select('role, title')
    .eq('user_id', userId)
    .maybeSingle<Pick<NetworkMemberRow, 'role' | 'title'>>()
  if (!data) return null
  return { role: data.role, title: data.title }
}
