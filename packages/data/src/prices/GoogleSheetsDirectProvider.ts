import { google, type sheets_v4 } from 'googleapis'
import { PriceProvider, allNull } from './PriceProvider'

/** Lit une feuille "Prices" (A: symbole, B: =GOOGLEFINANCE) via service account. */
export class GoogleSheetsDirectProvider implements PriceProvider {
  private sheets: sheets_v4.Sheets
  private sheetId: string
  private range = 'Prices!A2:B1000' // limite arbitraire ; >999 lignes de prix seraient tronquées

  constructor(sheetId?: string) {
    this.sheetId = sheetId ?? process.env['GOOGLE_SHEETS_PRICE_SHEET_ID'] ?? ''
    if (!this.sheetId) throw new Error('GOOGLE_SHEETS_PRICE_SHEET_ID requis')
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    this.sheets = google.sheets({ version: 'v4', auth })
  }

  async getPrices(symbols: string[]): Promise<Record<string, number | null>> {
    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: this.range,
      })
      const rows = (res.data.values ?? []) as unknown[][]
      const map: Record<string, number> = {}
      for (const row of rows) {
        const sym = String(row[0] ?? '').trim()
        const price = Number.parseFloat(String(row[1] ?? ''))
        if (sym && Number.isFinite(price)) map[sym] = price
      }
      return Object.fromEntries(symbols.map((s) => [s, map[s] ?? null]))
    } catch {
      return allNull(symbols)
    }
  }

  getName(): string {
    return 'GoogleSheetsDirect'
  }
}
