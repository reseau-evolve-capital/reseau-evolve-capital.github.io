/** Abstraction de récupération de cours live (PFT-007). Distincte du stub S4
 *  price-provider.ts (getQuotePartValue, book) utilisé par le dashboard. */
export interface PriceProvider {
  /** Retourne un prix par symbole (null si indisponible). N'échoue jamais : null en cas d'erreur. */
  getPrices(symbols: string[]): Promise<Record<string, number | null>>
  getName(): string
}

/** Construit un map { symbol: null } pour tous les symboles. */
export function allNull(symbols: string[]): Record<string, number | null> {
  return Object.fromEntries(symbols.map((s) => [s, null]))
}
