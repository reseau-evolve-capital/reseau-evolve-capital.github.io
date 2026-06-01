'use client'

import { useQuery } from '@tanstack/react-query'
import type { ClubSummary } from '@/lib/data/admin'

export async function fetchClubSummary(clubId: string): Promise<ClubSummary> {
  const res = await fetch(`/api/admin/club-summary?club_id=${encodeURIComponent(clubId)}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('club_summary_fetch_failed')
  return (await res.json()) as ClubSummary
}

export function useClubSummary(initialData: ClubSummary) {
  return useQuery({
    queryKey: ['admin', 'club-summary', initialData.clubId],
    queryFn: () => fetchClubSummary(initialData.clubId),
    initialData,
    staleTime: 5 * 60 * 1000,
  })
}
