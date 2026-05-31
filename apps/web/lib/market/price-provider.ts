/** Abstraction de valorisation d'une quote-part. V0 = "book" (valeur stockée, sync 2h).
 *  Sprint Portfolio (PFT-007) fournira une impl "live" (Σ positions × live_price × detention). */
export interface QuotePartInput {
  netMarketValueBook: number
  detentionPct: number
}

export interface PriceProvider {
  getQuotePartValue(input: QuotePartInput): number
}

export const bookPriceProvider: PriceProvider = {
  getQuotePartValue: ({ netMarketValueBook }) => netMarketValueBook,
}
