'use client'

// Hook prix live (PFT-007). Appelle GET /api/market-prices (server-only).
//
// Les secrets providers ne transitent jamais côté client : le hook ne fait qu'un
// fetch sur la route API Next.js qui délègue à getPricesWithFallback.
//
// Clé de query stable : les symboles sont triés + joints en string pour éviter
// les refetch parasites quand le tableau de référence change sans changer le contenu.
//
// enabled : false quand la liste est vide → pas de requête inutile.
//
// Réf : PFT-007, CLAUDE.md (valorisation live côté frontend).

import { useQuery } from '@tanstack/react-query'

export type LivePrices = Record<string, number | null>

/** Appelle GET /api/market-prices. Throw si la réponse n'est pas ok. */
export async function fetchLivePrices(symbols: string[]): Promise<LivePrices> {
  if (symbols.length === 0) return {}
  const q = encodeURIComponent(symbols.join(','))
  const res = await fetch(`/api/market-prices?symbols=${q}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('market_prices_fetch_failed')
  const data = (await res.json()) as { prices?: LivePrices }
  return data.prices ?? {}
}

export function useLivePrices(symbols: string[]) {
  // Tri stable pour éviter les refetch quand la référence du tableau change.
  const key = [...symbols].sort()
  return useQuery({
    queryKey: ['market-prices', key],
    queryFn: () => fetchLivePrices(key),
    enabled: symbols.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
