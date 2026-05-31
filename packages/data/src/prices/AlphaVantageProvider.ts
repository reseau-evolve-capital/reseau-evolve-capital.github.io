import { PriceProvider } from './PriceProvider'

/** Provider Alpha Vantage : appelle GLOBAL_QUOTE pour chaque symbole séquentiellement. */
export class AlphaVantageProvider implements PriceProvider {
  private apiKey: string
  private baseUrl = 'https://www.alphavantage.co/query'

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env['ALPHA_VANTAGE_KEY'] ?? ''
    if (!this.apiKey) throw new Error('ALPHA_VANTAGE_KEY requis')
  }

  async getPrices(symbols: string[]): Promise<Record<string, number | null>> {
    const result: Record<string, number | null> = {}
    for (const symbol of symbols) {
      try {
        const url = new URL(this.baseUrl)
        url.searchParams.set('function', 'GLOBAL_QUOTE')
        url.searchParams.set('symbol', symbol)
        url.searchParams.set('apikey', this.apiKey)
        const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) })
        if (!res.ok) {
          result[symbol] = null
          continue
        }
        const data = (await res.json()) as { 'Global Quote'?: Record<string, string> }
        const price = Number.parseFloat(data['Global Quote']?.['05. price'] ?? '')
        result[symbol] = Number.isFinite(price) ? price : null
      } catch {
        result[symbol] = null
      }
    }
    return result
  }

  getName(): string {
    return 'AlphaVantage'
  }
}
