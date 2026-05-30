/** Nettoyage des nombres au format FR issus de Google Sheets. */
function normalize(v: string | null | undefined): string {
  if (v == null) return ''
  // strip espace classique + NBSP + narrow NBSP, virgule → point
  return v
    .replace(/[\s  ]/g, '')
    .replace(',', '.')
    .trim()
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
