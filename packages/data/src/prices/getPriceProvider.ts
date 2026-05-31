import { PriceProvider, allNull } from './PriceProvider'
import { GoogleAppsScriptProvider } from './GoogleAppsScriptProvider'
import { GoogleSheetsDirectProvider } from './GoogleSheetsDirectProvider'
import { AlphaVantageProvider } from './AlphaVantageProvider'

/** Liste ordonnée des providers disponibles selon les env vars présentes. */
function configuredProviders(): PriceProvider[] {
  const out: PriceProvider[] = []
  if (process.env['GOOGLE_APPS_SCRIPT_URL'] && process.env['GOOGLE_APPS_SCRIPT_SECRET']) {
    out.push(new GoogleAppsScriptProvider())
  }
  if (process.env['GOOGLE_SHEETS_PRICE_SHEET_ID']) {
    out.push(new GoogleSheetsDirectProvider())
  }
  if (process.env['ALPHA_VANTAGE_KEY']) {
    out.push(new AlphaVantageProvider())
  }
  return out
}

/**
 * Essaie chaque provider dans l'ordre ; passe au suivant si des symboles manquent.
 * Aucun provider configuré → tous les symboles à null (pas de crash : décision de cadrage PFT-007).
 */
export async function getPricesWithFallback(
  symbols: string[]
): Promise<Record<string, number | null>> {
  if (symbols.length === 0) return {}
  const providers = configuredProviders()
  if (providers.length === 0) return allNull(symbols)

  let last: Record<string, number | null> = allNull(symbols)
  for (const provider of providers) {
    const prices = await provider.getPrices(symbols)
    if (symbols.every((s) => prices[s] != null)) return prices
    last = prices
  }
  return last
}
