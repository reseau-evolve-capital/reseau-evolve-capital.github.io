// Couche data des invitations (ADM-007). Lectures via la RLS « invitations: staff read ».
// Les MUTATIONS passent par les Server Actions + RPC SECURITY DEFINER (jamais ici).
// Le statut « expiré » est calculé À LA LECTURE (pending + expires_at < now) : pas de job de
// balayage en V0 → le badge reflète l'état réel. Dates renvoyées en ISO (formatage UI via @evolve/utils).
//
// Réf : ADM-007-PLAN.md, DATA_MODEL.md §3, CLAUDE.md (RLS, jamais service-role en lecture).

import type { createServerClient, Database } from '@evolve/data'

type ServerClient = ReturnType<typeof createServerClient>
export type InvitationStatus = Database['public']['Enums']['invitation_status']

/** Invitation consolidée (vue trésorier). `status` = statut EFFECTIF (pending échu → 'expired'). */
export interface Invitation {
  id: string
  email: string
  status: InvitationStatus
  invitedAt: string
  expiresAt: string
}

// ─── Helpers PURS (testés sans DB) ──────────────────────────────────────────

/** Statut effectif : une invitation `pending` dont l'échéance est passée est « expired ». */
export function effectiveInvitationStatus(
  status: InvitationStatus,
  expiresAt: string,
  now: Date = new Date()
): InvitationStatus {
  if (status === 'pending' && new Date(expiresAt).getTime() < now.getTime()) return 'expired'
  return status
}

/** Renvoyer un lien possible sur une invitation en attente ou expirée (pas acceptée/révoquée). */
export function canResendInvitation(status: InvitationStatus): boolean {
  return status === 'pending' || status === 'expired'
}

/** Révoquer possible uniquement tant que l'invitation est en attente. */
export function canRevokeInvitation(status: InvitationStatus): boolean {
  return status === 'pending'
}

// ─── Helper DB (session + RLS treasurer) ────────────────────────────────────

/** Toutes les invitations du club (RLS staff). Statut « expiré » calculé à la lecture. */
export async function listClubInvitations(
  supabase: ServerClient,
  clubId: string
): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select('id, email, status, invited_at, expires_at')
    .eq('club_id', clubId)
    .order('invited_at', { ascending: false })
    .returns<
      {
        id: string
        email: string
        status: InvitationStatus
        invited_at: string
        expires_at: string
      }[]
    >()
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    status: effectiveInvitationStatus(r.status, r.expires_at),
    invitedAt: r.invited_at,
    expiresAt: r.expires_at,
  }))
}
