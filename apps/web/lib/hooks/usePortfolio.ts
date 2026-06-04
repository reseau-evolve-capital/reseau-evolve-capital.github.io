'use client'

// Hook données portefeuille (PFT-004). Hydrate depuis `initialData` (RSC) puis laisse
// TanStack Query gérer le refetch : refetch au focus fenêtre + pull-to-refresh manuel
// (invalidateQueries depuis les composants).
//
// `fetchPortfolio` est exporté pour pouvoir le tester unitairement (mock de fetch).
//
// Sémantique de la route (FIX-API-001) :
//   - 200 avec positions non vides → données (état nominal)
//   - 200 avec `positions: []` (club existant, portefeuille vide) → null (état empty)
//   - 404 (aucun club) → null (état empty)
//   - tout autre !ok (401/500…) → throw (état error)
// On normalise les deux cas « empty » (200 vide + 404 club) vers `null` pour conserver
// la dégradation UI existante (`!data` → EmptyState), sans toucher à PortfolioView.
//
// Réf : PFT-004, FIX-API-001, CLAUDE.md (jamais de NaN/undefined, états empty/error explicites).

import { useQuery } from '@tanstack/react-query'

import type { PortfolioData } from '@/lib/data/portfolio'

/** Appelle GET /api/portfolio. 200 vide ou 404 club → null (état empty), !ok → throw (état error). */
export async function fetchPortfolio(): Promise<PortfolioData | null> {
  const res = await fetch('/api/portfolio', { headers: { Accept: 'application/json' } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('portfolio_fetch_failed')
  const data = (await res.json()) as PortfolioData
  // Portefeuille vide → état empty (l'UI affiche l'EmptyState sur `!data`).
  if (data.positions.length === 0) return null
  return data
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
