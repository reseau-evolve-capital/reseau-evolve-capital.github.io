'use client'

import { useQuery } from '@tanstack/react-query'
import type { ClubMember } from '@/lib/data/admin'

export interface ClubMembersPayload {
  clubId: string
  members: ClubMember[]
}

export async function fetchClubMembers(clubId: string): Promise<ClubMembersPayload> {
  const res = await fetch(`/api/admin/members?club_id=${encodeURIComponent(clubId)}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('club_members_fetch_failed')
  return (await res.json()) as ClubMembersPayload
}

export function useClubMembers(initialData: ClubMembersPayload) {
  return useQuery({
    queryKey: ['admin', 'members', initialData.clubId],
    queryFn: () => fetchClubMembers(initialData.clubId),
    initialData,
    staleTime: 5 * 60 * 1000,
  })
}
