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
 * Essaie chaque provider dans l'ordre et accumule les prix trouvés.
 * Chaque provider complète les symboles encore manquants (null) dans le résultat merge :
 * si provider 1 trouve A et provider 2 trouve B, on conserve A ET B.
 * On s'arrête dès que tous les symboles ont un prix non-null.
 * Aucun provider configuré → tous les symboles à null (pas de crash : décision de cadrage PFT-007).
 */
export async function getPricesWithFallback(
  symbols: string[]
): Promise<Record<string, number | null>> {
  if (symbols.length === 0) return {}
  const providers = configuredProviders()
  if (providers.length === 0) return allNull(symbols)

  const merged = allNull(symbols)
  for (const provider of providers) {
    const prices = await provider.getPrices(symbols)
    for (const s of symbols) {
      if (merged[s] == null && prices[s] != null) merged[s] = prices[s] as number
    }
    if (symbols.every((s) => merged[s] != null)) return merged // tous trouvés → stop
  }
  return merged
}
