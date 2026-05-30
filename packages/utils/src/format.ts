/** Formatters monétaires et pourcentage — locale FR avec NBSP
 *  Convention : NaN / undefined / Infinity → "—" (tiret cadratin)
 *  ⚠️  TOUJOURS utiliser ces fonctions, jamais toLocaleString() directement. */

const FR_LOCALE = 'fr-FR'
const FALLBACK = '—'

function isValid(n: number): boolean {
  return typeof n === 'number' && isFinite(n) && !isNaN(n)
}

/** 65574.87 → "65 574,87 €" (espace insécable comme séparateur milliers) */
export function formatEUR(value: number): string {
  if (!isValid(value)) return FALLBACK
  return new Intl.NumberFormat(FR_LOCALE, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** 0.0123 → "+1,23 %" avec signe par défaut */
export function formatPct(value: number, opts?: { showSign?: boolean }): string {
  if (!isValid(value)) return FALLBACK
  const showSign = opts?.showSign ?? true
  return new Intl.NumberFormat(FR_LOCALE, {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: showSign ? 'exceptZero' : 'never',
  }).format(value)
}

/** Date → "03/05/2026" (format FR court) */
export function formatDate(date: Date | string | number): string {
  try {
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return FALLBACK
    return new Intl.DateTimeFormat(FR_LOCALE, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d)
  } catch {
    return FALLBACK
  }
}

/** Date → "mai 2026" (mois + année en minuscule FR) */
export function formatMonth(date: Date | string | number): string {
  try {
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return FALLBACK
    return new Intl.DateTimeFormat(FR_LOCALE, {
      month: 'long',
      year: 'numeric',
    }).format(d)
  } catch {
    return FALLBACK
  }
}
