'use client'

import { useQuery } from '@tanstack/react-query'
import type { AdminContribPayload } from '@/lib/data/admin'

export type { AdminContribPayload } from '@/lib/data/admin'

export interface AdminContribOption {
  id: string
  fullName: string
  /** Valeur boursière nette détenue par le membre (€). null si non renseignée.
   *  Affichée (carte dédiée) uniquement quand ce membre est filtré dans la vue admin. */
  netMarketValue: number | null
}

export async function fetchAdminContributions(
  clubId: string,
  membershipId: string | null
): Promise<AdminContribPayload> {
  const params = new URLSearchParams({ club_id: clubId })
  if (membershipId) params.set('membership_id', membershipId)
  const res = await fetch(`/api/admin/contributions?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('admin_contributions_fetch_failed')
  return (await res.json()) as AdminContribPayload
}

/**
 * Query cotisations admin filtrables par membre.
 *
 * Quand `membershipId` est null → `initialData` est utilisé (pas de fetch au montage).
 * Quand `membershipId` est non-null → la query fetch ; `placeholderData` garde l'affichage
 * précédent pendant le chargement. La View doit gérer `data` possiblement `undefined` au
 * 1er rendu filtré (fallback sur `initialData`).
 */
export function useAdminContributions(
  initialData: AdminContribPayload,
  membershipId: string | null
) {
  return useQuery({
    queryKey: ['admin', 'contributions', initialData.clubId, membershipId],
    queryFn: () => fetchAdminContributions(initialData.clubId, membershipId),
    // Mode club (membershipId=null) : l'initialData SSR fait autorité, ne jamais refetch
    // (le refetch renverrait EMPTY_CLUB_STATS depuis l'API route et écraserait les vraies stats).
    enabled: membershipId !== null,
    initialData: membershipId ? undefined : initialData,
    placeholderData: (prev) => prev,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}
