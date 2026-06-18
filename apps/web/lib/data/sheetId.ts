// Extraction de l'ID d'une feuille Google Sheets côté UI (NET-006). Miroir de
// `extractSheetId` de supabase/functions/sheet-probe/index.ts : l'utilisateur peut coller une URL
// complète OU un ID brut. L'Edge ré-extrait défensivement de toute façon ; on extrait aussi ici
// pour afficher / transmettre un ID propre. Pur, testable, sans dépendance.

/**
 * Renvoie l'ID d'une feuille depuis une URL Google Sheets, ou l'entrée si c'est déjà un ID brut.
 * Formats : `https://docs.google.com/spreadsheets/d/<ID>/edit#gid=0`, ID nu (`1aBc…`).
 * `null` si rien d'exploitable.
 */
export function extractSheetIdFromInput(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed === '') return null
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (urlMatch?.[1]) return urlMatch[1]
  if (/^[a-zA-Z0-9-_]+$/.test(trimmed)) return trimmed
  return null
}
