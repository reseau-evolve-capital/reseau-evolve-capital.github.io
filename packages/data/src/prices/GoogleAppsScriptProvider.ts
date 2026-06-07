import { PriceProvider, allNull } from './PriceProvider.ts'

/** Provider Google Apps Script : appelle un webapp GAS qui retourne { prices: { symbol: number } }. */
export class GoogleAppsScriptProvider implements PriceProvider {
  private url: string
  private secret: string

  constructor(url?: string, secret?: string) {
    this.url = url ?? process.env['GOOGLE_APPS_SCRIPT_URL'] ?? ''
    this.secret = secret ?? process.env['GOOGLE_APPS_SCRIPT_SECRET'] ?? ''
    if (!this.url || !this.secret) {
      throw new Error('GOOGLE_APPS_SCRIPT_URL et GOOGLE_APPS_SCRIPT_SECRET requis')
    }
  }

  async getPrices(symbols: string[]): Promise<Record<string, number | null>> {
    try {
      const url = new URL(this.url)
      url.searchParams.set('symbols', symbols.join(','))
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${this.secret}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return allNull(symbols)
      const data = (await res.json()) as { prices?: Record<string, number> }
      const prices = data.prices ?? {}
      return Object.fromEntries(
        symbols.map((s) => {
          const v = prices[s]
          return [s, typeof v === 'number' ? v : null]
        })
      )
    } catch {
      return allNull(symbols)
    }
  }

  getName(): string {
    return 'GoogleAppsScript'
  }
}
