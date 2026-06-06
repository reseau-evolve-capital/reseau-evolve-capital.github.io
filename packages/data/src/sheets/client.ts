import { google } from 'googleapis'

/**
 * Décode le service account depuis GOOGLE_SA_KEY_BASE64 (JSON base64).
 * Lève une erreur descriptive si la variable est absente ou invalide.
 */
function loadServiceAccountCredentials(): Record<string, unknown> {
  const raw = process.env.GOOGLE_SA_KEY_BASE64
  if (!raw || raw.trim() === '') {
    throw new Error('Variable GOOGLE_SA_KEY_BASE64 manquante.')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
  } catch {
    throw new Error('GOOGLE_SA_KEY_BASE64 invalide : base64/JSON non décodable.')
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('GOOGLE_SA_KEY_BASE64 invalide : objet JSON attendu.')
  }
  return parsed as Record<string, unknown>
}

/**
 * Lit une plage d'une feuille Google Sheets et retourne les valeurs sous forme
 * de tableau 2D `string[][]`. Chaque cellule est coercée en string (null → '').
 *
 * @param sheetId   - ID de la matrice (visible dans l'URL Google Sheets)
 * @param sheetName - Nom de l'onglet (ex : 'Base', 'POSITIONS')
 * @param range     - Plage A1 optionnelle (défaut : A1:AZ2000)
 */
export async function readSheet(
  sheetId: string,
  sheetName: string,
  range = 'A1:AZ2000'
): Promise<string[][]> {
  const credentials = loadServiceAccountCredentials()
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  const sheets = google.sheets({ version: 'v4', auth })
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!${range}`,
    })
    const values = response.data.values
    if (!values) return []
    // L'API googleapis type values en any[][] — on coerce explicitement chaque cellule.
    return values.map((row: unknown[]) =>
      row.map((cell: unknown) => (cell == null ? '' : String(cell)))
    )
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'erreur inconnue'
    throw new Error(`Feuille "${sheetName}" inaccessible : ${detail}`)
  }
}
