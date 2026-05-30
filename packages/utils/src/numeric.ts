/**
 * Nettoie un nombre au format FR issu de Google Sheets :
 * retire espaces / NBSP (U+00A0) / narrow-NBSP (U+202F), gère le point comme
 * séparateur de milliers quand une virgule décimale est présente (ex: "1.234,56"
 * → "1234.56"), puis convertit la virgule décimale en point.
 * Quand il n'y a pas de virgule, les points sont conservés tels quels
 * (format déjà dot-decimal, ex: "1234.56").
 */
function normalize(v: string | null | undefined): string {
  if (v == null) return ''
  let s = v.replace(/[\s  ]/g, '').trim()
  if (s.includes(',')) {
    // virgule = décimale FR → le point est un séparateur de milliers
    s = s.replace(/\./g, '').replace(',', '.')
  }
  return s
}

/** Nombre ou null si vide/NaN. Usage mappers (colonnes nullable). */
export function toNumOrNull(v: string | null | undefined): number | null {
  const c = normalize(v)
  if (c === '') return null
  const n = Number.parseFloat(c)
  return Number.isNaN(n) ? null : n
}

/** Nombre avec fallback 0. */
export function toNum(v: string | null | undefined): number {
  return toNumOrNull(v) ?? 0
}

/** Entier avec fallback 0. */
export function toInt(v: string | null | undefined): number {
  const c = normalize(v)
  if (c === '') return 0
  const n = Number.parseInt(c, 10)
  return Number.isNaN(n) ? 0 : n
}
