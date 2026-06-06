/** Parsing de dates FR pour l'ingestion Sheets. Tout invalide → null (jamais throw). */

import { stripAccents } from './strings'

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
  const normalized = stripAccents(input.trim().toLowerCase())
  const m = normalized.match(/^([a-z]+)\s+(\d{4})$/)
  if (!m) return null
  const month = FR_MONTHS[m[1]!]
  if (month == null) return null
  return { year: Number(m[2]), month }
}

/** Date passée → "à l'instant" | "il y a 14 min" | "il y a 2 h" | "il y a 3 j" (FR) ;
 *  "just now" | "14 min ago" | "2 h ago" | "3 d ago" (autres locales, ex. en).
 *  Entrée invalide → "—". `now` injectable pour les tests ; `locale` défaut fr-FR
 *  (rendu FR byte-identique). On garde le format abrégé maison (Intl.RelativeTimeFormat
 *  donnerait « il y a 5 minutes », pas « il y a 5 min »). */
export function formatRelativeTime(
  input: Date | string | number,
  now: Date = new Date(),
  locale = 'fr-FR'
): string {
  const d = input instanceof Date ? input : new Date(input)
  if (isNaN(d.getTime())) return '—'
  const diffMs = now.getTime() - d.getTime()
  const sec = Math.max(0, Math.floor(diffMs / 1000))
  const fr = locale.startsWith('fr')
  if (sec < 60) return fr ? "à l'instant" : 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return fr ? `il y a ${min} min` : `${min} min ago`
  const h = Math.floor(min / 60)
  if (h < 24) return fr ? `il y a ${h} h` : `${h} h ago`
  const j = Math.floor(h / 24)
  return fr ? `il y a ${j} j` : `${j} d ago`
}
