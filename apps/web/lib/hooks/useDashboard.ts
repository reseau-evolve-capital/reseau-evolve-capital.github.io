'use client'

// Hook de données du dashboard membre (DSH-007b).
//
// Hydrate depuis `initialData` (RSC) puis laisse TanStack Query gérer le refetch :
// pull-to-refresh manuel (invalidateQueries) + refetch au focus fenêtre.
// `fetchDashboard` est exporté pour pouvoir le tester unitairement (mock de fetch).
//
// Réf : DSH-007b, CLAUDE.md (états reassurants, jamais de NaN/undefined).

import { useQuery } from '@tanstack/react-query'

import type { DashboardData } from '@/lib/data/dashboard'

/** Appelle GET /api/dashboard. 404 → null (état empty), !ok → throw (état error). */
export async function fetchDashboard(): Promise<DashboardData | null> {
  const res = await fetch('/api/dashboard', { headers: { Accept: 'application/json' } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('dashboard_fetch_failed')
  return (await res.json()) as DashboardData
}

export function useDashboard(initialData: DashboardData | null) {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    initialData,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}
