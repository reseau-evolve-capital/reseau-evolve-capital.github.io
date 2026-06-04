'use client'

import { useQuery } from '@tanstack/react-query'
import type { Invitation } from '@/lib/data/invitations'

export interface ClubInvitationsPayload {
  clubId: string
  invitations: Invitation[]
}

export async function fetchClubInvitations(clubId: string): Promise<ClubInvitationsPayload> {
  const res = await fetch(`/api/admin/invitations?club_id=${encodeURIComponent(clubId)}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('club_invitations_fetch_failed')
  return (await res.json()) as ClubInvitationsPayload
}

/** Clé ['admin','invitations',clubId] — invalidée par les Server Actions invitation. */
export function useClubInvitations(initialData: ClubInvitationsPayload) {
  return useQuery({
    queryKey: ['admin', 'invitations', initialData.clubId],
    queryFn: () => fetchClubInvitations(initialData.clubId),
    initialData,
    staleTime: 60 * 1000,
  })
}
