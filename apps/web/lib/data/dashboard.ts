// Couche data du dashboard membre (DSH-006).
//
// `member_quote_part` est une vue (security_invoker, migration 030) : recalculée à chaque
// requête → toujours à jour, suit la cascade de re-key user_id à la 1re connexion (pas de MV
// figée). Elle porte la valeur BOOK (`net_market_value`) — décision V0 : pas de prix live ici.
// La RLS des tables sous-jacentes isole les lignes par `auth.uid()` (policies memberships +
// contributions « own read »).
//
// `syncedAt` exposé à l'UI vient de `clubs.synced_at` (timestamp du CLUB, MAJ à chaque sync),
// pas de `member_quote_part.synced_at` (par-membre, désynchronisable) : source unique partagée
// avec la topbar desktop (layout (app)) pour un statut de sync cohérent desktop/mobile (E2).
//
// Réf : DATA_MODEL.md §2 (vue member_quote_part), CLAUDE.md (valorisation book V0).

import type { createServerClient } from '@evolve/data'
import type { Database } from '@evolve/data'

/** Client Supabase serveur tel que retourné par `createServerClient` (session + RLS). */
type ServerClient = ReturnType<typeof createServerClient>

type MemberQuotePartRow = Database['public']['Views']['member_quote_part']['Row']
type UserRow = Database['public']['Tables']['users']['Row']
type ClubRow = Database['public']['Tables']['clubs']['Row']

export type ContributionStatus = Database['public']['Enums']['contribution_status']
export type MemberRole = Database['public']['Enums']['member_role']

export interface DashboardData {
  member: { firstname: string | null; fullName: string; role: MemberRole; joinedAt: string | null }
  clubId: string
  netMarketValue: number
  detentionPct: number // fraction 0..1
  totalContributed: number
  contribution: { status: ContributionStatus; amountDue: number }
  club: { name: string }
  syncedAt: string | null
}

const STATUS_LABEL: Record<ContributionStatus, string> = {
  ok: 'À jour',
  pending: 'En attente',
  late: 'En retard',
  exempt: 'Exempté',
}

export function contributionStatusLabel(s: ContributionStatus): string {
  return STATUS_LABEL[s] ?? '—'
}

/** Charge les données dashboard du membre courant. RLS isole par auth.uid().
 *  Retourne null si aucune ligne member_quote_part (état empty). */
export async function getDashboardData(
  supabase: ServerClient,
  userId: string,
  clubId: string
): Promise<DashboardData | null> {
  const { data: mqp, error } = await supabase
    .from('member_quote_part')
    .select(
      'role, joined_at, detention_pct, total_contributed, net_market_value, contribution_status, amount_due'
    )
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .maybeSingle<
      Pick<
        MemberQuotePartRow,
        | 'role'
        | 'joined_at'
        | 'detention_pct'
        | 'total_contributed'
        | 'net_market_value'
        | 'contribution_status'
        | 'amount_due'
      >
    >()
  if (error) throw error
  if (!mqp) return null

  // La vue ne porte PAS les colonnes de nom : on lit le profil séparément (DATA_MODEL.md §2).
  // On lit aussi `clubs.synced_at` : source unique du statut de sync (E2), partagée avec la topbar.
  const [{ data: profile }, { data: club }] = await Promise.all([
    supabase
      .from('users')
      .select('firstname, full_name')
      .eq('id', userId)
      .maybeSingle<Pick<UserRow, 'firstname' | 'full_name'>>(),
    supabase
      .from('clubs')
      .select('name, synced_at')
      .eq('id', clubId)
      .maybeSingle<Pick<ClubRow, 'name' | 'synced_at'>>(),
  ])

  return {
    member: {
      firstname: profile?.firstname ?? null,
      fullName: profile?.full_name ?? 'Membre',
      role: mqp.role ?? 'member',
      joinedAt: mqp.joined_at,
    },
    clubId,
    netMarketValue: Number(mqp.net_market_value ?? 0),
    detentionPct: Number(mqp.detention_pct ?? 0),
    totalContributed: Number(mqp.total_contributed ?? 0),
    contribution: {
      status: mqp.contribution_status ?? 'pending',
      amountDue: Number(mqp.amount_due ?? 0),
    },
    club: { name: club?.name ?? '—' },
    // E2 : statut de sync unifié sur le timestamp du CLUB (≠ member_quote_part.synced_at par-membre).
    syncedAt: club?.synced_at ?? null,
  }
}
