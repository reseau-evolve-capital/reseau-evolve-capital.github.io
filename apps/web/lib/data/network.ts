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

import type { NetworkClubRow } from '@evolve/ui'
import type { createServerClient, Database } from '@evolve/data'

type ServerClient = ReturnType<typeof createServerClient>
type NetworkMemberRow = Database['public']['Tables']['network_members']['Row']

export type NetworkRole = Database['public']['Enums']['network_role']
export type NetworkTitle = Database['public']['Enums']['network_title']

/** Ligne brute renvoyée par le RPC `network_list_clubs()` (migration 043). */
type NetworkListClubsRow = Database['public']['Functions']['network_list_clubs']['Returns'][number]

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

// ─────────────────────────────────────────────────────────────────────────────
// NET-005 — Liste des clubs (écran /reseau/clubs) + KPIs du bandeau.
// ─────────────────────────────────────────────────────────────────────────────

/** Agrégats du bandeau KPI du cockpit RÉSEAU, dérivés des lignes clubs (côté serveur). */
export interface NetworkKpis {
  /** Nombre de clubs du réseau. */
  clubsCount: number
  /** Somme des membres actifs de tous les clubs. */
  totalActiveMembers: number
  /** Capital cumulé (somme des valos agrégées connues). `null` si AUCUN club n'a de valo. */
  cumulativeCapital: number | null
}

/** Données de l'écran /reseau/clubs : lignes présentationnelles + KPIs pré-calculés. */
export interface NetworkClubsPayload {
  clubs: NetworkClubRow[]
  kpis: NetworkKpis
}

/**
 * Calcule les 3 KPIs du bandeau depuis les lignes clubs. Pur & exporté pour test.
 * `cumulativeCapital` est `null` tant qu'aucun club n'a de valorisation connue (jamais de delta
 * « 0 € » trompeur sur un réseau non synchronisé) — l'UI masque alors la pill de variation.
 */
export function deriveNetworkKpis(clubs: NetworkClubRow[]): NetworkKpis {
  const withValuation = clubs.filter((c) => c.aggregatedValuation != null)
  return {
    clubsCount: clubs.length,
    totalActiveMembers: clubs.reduce((sum, c) => sum + c.activeMembersCount, 0),
    cumulativeCapital:
      withValuation.length === 0
        ? null
        : withValuation.reduce((sum, c) => sum + (c.aggregatedValuation ?? 0), 0),
  }
}

/**
 * Liste tous les clubs du réseau via le RPC `network_list_clubs()` (SECURITY DEFINER, gardé
 * `is_network_member()` — migration 043), mappe vers la forme présentationnelle `NetworkClubRow`
 * et dérive les KPIs du bandeau. UNE passe SQL (le RPC pré-agrège, pas de N+1). JAMAIS de
 * service-role : la garde est dans le RPC + le layout /reseau.
 *
 * `last_synced_at` est typé non-null par types.gen.ts mais le RPC renvoie `clubs.synced_at`
 * (nullable) → on le traite défensivement comme `string | null` (« — »/« jamais » côté UI).
 */
export async function getNetworkClubs(supabase: ServerClient): Promise<NetworkClubsPayload> {
  const { data, error } = await supabase.rpc('network_list_clubs')
  if (error) throw error

  const rows = (data ?? []) as NetworkListClubsRow[]
  const clubs: NetworkClubRow[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    activeMembersCount: Number(c.active_members_count ?? 0),
    // `aggregated_valuation` peut être null (club jamais synchronisé) → on préserve null.
    aggregatedValuation: c.aggregated_valuation == null ? null : Number(c.aggregated_valuation),
    lastSyncedAt: (c.last_synced_at as string | null) ?? null,
    matrixConnected: Boolean(c.matrix_connected),
  }))

  return { clubs, kpis: deriveNetworkKpis(clubs) }
}
