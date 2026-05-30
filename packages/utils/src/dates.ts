/** Parsing de dates FR pour l'ingestion Sheets. Tout invalide → null (jamais throw). */

/** "01/06/2018" | "01-06-2018" → Date UTC à minuit. null si invalide. */
export function parseFrDate(input: string | null | undefined): Date | null {
  if (input == null) return null
  const s = input.trim()
  if (s === '') return null
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!m) return null
  const day = Number(m[1]!)
  const month = Number(m[2]!)
  const year = Number(m[3]!)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null
  return d
}

const FR_MONTHS: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
}

/** "juin 2018" → { year: 2018, month: 6 }. Insensible casse/accents. null si invalide. */
export function parseFrMonth(
  input: string | null | undefined
): { year: number; month: number } | null {
  if (input == null) return null
  const normalized = input.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const m = normalized.match(/^([a-z]+)\s+(\d{4})$/)
  if (!m) return null
  const month = FR_MONTHS[m[1]!]
  if (month == null) return null
  return { year: Number(m[2]), month }
}
