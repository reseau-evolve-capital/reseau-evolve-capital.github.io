import { describe, it, expect } from 'vitest'

import { bookPriceProvider } from './price-provider'

describe('bookPriceProvider', () => {
  it('retourne la valeur book et ignore la détention (V0)', () => {
    expect(
      bookPriceProvider.getQuotePartValue({ netMarketValueBook: 1000, detentionPct: 0.1 })
    ).toBe(1000)
  })

  it('retourne 0 pour une valeur book nulle', () => {
    expect(bookPriceProvider.getQuotePartValue({ netMarketValueBook: 0, detentionPct: 0.5 })).toBe(
      0
    )
  })
})
