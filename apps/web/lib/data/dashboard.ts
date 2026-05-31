// Couche data du dashboard membre (DSH-006).
//
// `member_quote_part` est une vue matérialisée rafraîchie toutes les 2h par la sync.
// Elle porte la valeur BOOK (`net_market_value`) — décision V0 : pas de prix live ici.
// La RLS isole automatiquement les lignes par `auth.uid()` (policies sur memberships).
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

export interface DashboardData {
  member: { firstname: string | null; fullName: string; role: string; joinedAt: string | null }
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
      'role, joined_at, detention_pct, total_contributed, net_market_value, contribution_status, amount_due, synced_at'
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
        | 'synced_at'
      >
    >()
  if (error) throw error
  if (!mqp) return null

  // La vue ne porte PAS les colonnes de nom : on lit le profil séparément (DATA_MODEL.md §2).
  const [{ data: profile }, { data: club }] = await Promise.all([
    supabase
      .from('users')
      .select('firstname, full_name')
      .eq('id', userId)
      .maybeSingle<Pick<UserRow, 'firstname' | 'full_name'>>(),
    supabase.from('clubs').select('name').eq('id', clubId).maybeSingle<Pick<ClubRow, 'name'>>(),
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
    syncedAt: mqp.synced_at ?? null,
  }
}
