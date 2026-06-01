'use client'

// Hook données portefeuille (PFT-004). Hydrate depuis `initialData` (RSC) puis laisse
// TanStack Query gérer le refetch : refetch au focus fenêtre + pull-to-refresh manuel
// (invalidateQueries depuis les composants).
//
// `fetchPortfolio` est exporté pour pouvoir le tester unitairement (mock de fetch).
//
// 404 → null (état empty), !ok → throw (état error).
//
// Réf : PFT-004, CLAUDE.md (jamais de NaN/undefined, états empty/error explicites).

import { useQuery } from '@tanstack/react-query'

import type { PortfolioData } from '@/lib/data/portfolio'

/** Appelle GET /api/portfolio. 404 → null (état empty), !ok → throw (état error). */
export async function fetchPortfolio(): Promise<PortfolioData | null> {
  const res = await fetch('/api/portfolio', { headers: { Accept: 'application/json' } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('portfolio_fetch_failed')
  return (await res.json()) as PortfolioData
}

export function usePortfolio(initialData: PortfolioData | null) {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: fetchPortfolio,
    initialData,
    // initialData null (RSC sans positions) → marquer "périmé depuis l'epoch" pour
    // refetch immédiat dès le montage/focus et récupérer d'éventuelles données fraîches.
    initialDataUpdatedAt: initialData ? undefined : 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}
