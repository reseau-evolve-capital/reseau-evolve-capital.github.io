'use client'

// Hook données cotisations (COT-004). Hydrate depuis `initialData` (RSC) puis laisse
// TanStack Query gérer le refetch (focus fenêtre + pull-to-refresh).
// 404 → null (état empty), !ok → throw (état error).
// Réf : COT-004, CLAUDE.md (états empty/error explicites).

import { useQuery } from '@tanstack/react-query'

import type { ContributionsData } from '@/lib/data/contributions'

/** Appelle GET /api/contributions. 404 → null (état empty), !ok → throw (état error). */
export async function fetchContributions(): Promise<ContributionsData | null> {
  const res = await fetch('/api/contributions', { headers: { Accept: 'application/json' } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('contributions_fetch_failed')
  return (await res.json()) as ContributionsData
}

export function useContributions(initialData: ContributionsData | null) {
  return useQuery({
    queryKey: ['contributions'],
    queryFn: fetchContributions,
    initialData,
    // initialData null (RSC sans cotisation) → marquer "périmé depuis l'epoch" pour
    // refetch immédiat dès le montage/focus.
    initialDataUpdatedAt: initialData ? undefined : 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}
