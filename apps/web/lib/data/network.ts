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
import {
  getClubSettings,
  ClubSettingsNotReadableError,
  type ClubSettings,
} from '@/lib/data/clubSettings'

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
 *
 * NET-018 — les clubs DÉSACTIVÉS (soft-disable, `isActive === false`) sont EXCLUS de tous les
 * agrégats : ils n'opèrent plus (matrice + sync bloqués, membres sans accès), il serait trompeur
 * de les compter dans « Clubs », « Membres actifs » ou « Capital cumulé ». Ils restent listés
 * (l'UI les distingue par un badge) mais ne pèsent pas sur les chiffres du réseau.
 */
export function deriveNetworkKpis(clubs: NetworkClubRow[]): NetworkKpis {
  const activeClubs = clubs.filter((c) => c.isActive !== false)
  const withValuation = activeClubs.filter((c) => c.aggregatedValuation != null)
  return {
    clubsCount: activeClubs.length,
    totalActiveMembers: activeClubs.reduce((sum, c) => sum + c.activeMembersCount, 0),
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
  const clubs: NetworkClubRow[] = rows.map(mapClubRow)

  return { clubs, kpis: deriveNetworkKpis(clubs) }
}

/** Mappe une ligne brute `network_list_clubs()` → forme présentationnelle `NetworkClubRow`. */
function mapClubRow(c: NetworkListClubsRow): NetworkClubRow {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    activeMembersCount: Number(c.active_members_count ?? 0),
    // `aggregated_valuation` peut être null (club jamais synchronisé) → on préserve null.
    aggregatedValuation: c.aggregated_valuation == null ? null : Number(c.aggregated_valuation),
    lastSyncedAt: (c.last_synced_at as string | null) ?? null,
    createdAt: (c.created_at as string | null) ?? null,
    matrixConnected: Boolean(c.matrix_connected),
    // NET-018 — soft-disable. Le RPC renvoie toujours `is_active` (migration 050) ; on défausse
    // sur `true` si la colonne est absente (compat type/listing pré-migration).
    isActive: c.is_active ?? true,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NET-007 — Fiche club (écran /reseau/clubs/[id]).
// ─────────────────────────────────────────────────────────────────────────────

/** Un membre staff du club (président / trésorier) pour la section « Rôles du club ». */
export interface NetworkClubStaffMember {
  userId: string
  fullName: string
  email: string
  role: Database['public']['Enums']['member_role']
}

/** Données complètes de la fiche club (en-tête KPI + matrice + paramètres + rôles). */
export interface NetworkClubDetail {
  /** Ligne KPI recap (membres actifs, valo, dernière sync, matrice branchée). */
  club: NetworkClubRow
  /** Le `sheet_id` actuel de la matrice (null = non branchée). Affiché tronqué + copier. */
  sheetId: string | null
  /** Paramètres éditables (nom, ville, pays, courtier, plafond, cotisation min). */
  settings: ClubSettings
  /** Staff actuel (président/trésorier), pour la section « Rôles du club ». */
  staff: NetworkClubStaffMember[]
}

/**
 * Charge la fiche club côté RÉSEAU (NET-007). Compose trois sources gardées `is_network_admin`
 * (ou réseau) côté RPC / RLS :
 *   - `network_list_clubs()` filtré par id → la ligne KPI recap (membres actifs, valo, sync) ;
 *   - lecture `clubs` (RLS authenticated lecture seule) → `sheet_id` + paramètres éditables ;
 *   - `network_list_club_members` (migration 044) → staff du club (filtré président/trésorier).
 * `null` si le club n'existe pas / n'est pas listé (→ notFound côté page). JAMAIS de service-role.
 *
 * Robustesse (club sans membre / sans RLS applicable sur clubs) :
 * Si `getClubSettings` lève `ClubSettingsNotReadableError` (club fraîchement créé sans membres,
 * ou policy non encore appliquée), on construit un fallback minimal à partir de la ligne déjà
 * lue via `network_list_clubs()` (SECURITY DEFINER, fonctionnel même sans membership).
 * La fiche s'affiche alors avec matrice "non connectée" et historique vide, sans crash.
 */
export async function getNetworkClubDetail(
  supabase: ServerClient,
  clubId: string
): Promise<NetworkClubDetail | null> {
  const { data: clubsData, error: clubsError } = await supabase.rpc('network_list_clubs')
  if (clubsError) throw clubsError
  const row = ((clubsData ?? []) as NetworkListClubsRow[]).find((c) => c.id === clubId)
  if (!row) return null

  // Lecture du sheet_id (RLS authenticated lecture seule sur clubs) + paramètres éditables.
  // getClubSettings peut lever ClubSettingsNotReadableError → on la capture pour construire
  // un fallback minimal (le club est dans la liste réseau donc son nom est déjà connu).
  const [sheetResult, settingsResult, membersResult] = await Promise.allSettled([
    supabase
      .from('clubs')
      .select('sheet_id')
      .eq('id', clubId)
      .maybeSingle<{ sheet_id: string | null }>(),
    getClubSettings(supabase, clubId),
    supabase.rpc('network_list_club_members', { p_club_id: clubId }),
  ])

  // Erreur réseau sur la liste des membres → crash (pas de fallback pertinent).
  const membersSettled = membersResult
  if (membersSettled.status === 'rejected') throw membersSettled.reason
  const { value: membersValue } = membersSettled
  if (membersValue.error) throw membersValue.error

  // Fallback settings si RLS refuse (club sans membres).
  let settings: ClubSettings
  if (settingsResult.status === 'fulfilled') {
    settings = settingsResult.value
  } else if (settingsResult.reason instanceof ClubSettingsNotReadableError) {
    // Club fraîchement créé ou sans membres : on construit un ClubSettings minimal
    // depuis la ligne network_list_clubs (nom connu, champs sensibles absents → null).
    settings = {
      clubId,
      name: row.name,
      city: null,
      country: null,
      brokerAccountRef: null,
      annualInvestmentCap: null,
      minContribution: 100,
      brokerName: null,
    }
  } else {
    // Erreur réseau réelle → on laisse remonter.
    throw settingsResult.reason
  }

  // sheet_id : si la RLS refuse aussi cette lecture (même cause), on retombe sur null.
  const sheetId =
    sheetResult.status === 'fulfilled' ? (sheetResult.value.data?.sheet_id ?? null) : null

  type MemberRow = Database['public']['Functions']['network_list_club_members']['Returns'][number]
  const staff: NetworkClubStaffMember[] = ((membersValue.data ?? []) as MemberRow[])
    .filter((m) => m.role === 'president' || m.role === 'treasurer')
    .map((m) => ({ userId: m.user_id, fullName: m.full_name, email: m.email, role: m.role }))

  return {
    club: mapClubRow(row),
    sheetId,
    settings,
    staff,
  }
}
