/** Formatters monétaires et pourcentage — locale-aware, FR par défaut, NBSP en FR.
 *  Convention : NaN / undefined / Infinity → "—" (tiret cadratin)
 *  ⚠️  TOUJOURS utiliser ces fonctions, jamais toLocaleString() directement.
 *
 *  `locale` est optionnel et vaut `fr-FR` par défaut → le rendu FR reste byte-identique.
 *  L'app peut passer la locale active (ex. `en-US`) pour un formatage localisé (I18N-001). */

/** Locale par défaut (produit FR-first). */
export const DEFAULT_LOCALE = 'fr-FR'
const FALLBACK = '—'

function isValid(n: number): boolean {
  return typeof n === 'number' && isFinite(n) && !isNaN(n)
}

/** 65574.87 → "65 574,87 €" (FR) · "€65,574.87" (en-US). La devise reste EUR. */
export function formatEUR(value: number, locale: string = DEFAULT_LOCALE): string {
  if (!isValid(value)) return FALLBACK
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** 0.0123 → "+1,23 %" (FR) · "+1.23%" (en-US). Signe par défaut. */
export function formatPct(value: number, opts?: { showSign?: boolean; locale?: string }): string {
  if (!isValid(value)) return FALLBACK
  const showSign = opts?.showSign ?? true
  return new Intl.NumberFormat(opts?.locale ?? DEFAULT_LOCALE, {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: showSign ? 'exceptZero' : 'never',
  }).format(value)
}

/** Date → "03/05/2026" (FR) · "05/03/2026" (en-US). Format court localisé. */
export function formatDate(date: Date | string | number, locale: string = DEFAULT_LOCALE): string {
  try {
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return FALLBACK
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d)
  } catch {
    return FALLBACK
  }
}

/** Date → "Vendredi 24 avril 2026" (FR) · "Friday, April 24, 2026" (en-US). 1ʳᵉ lettre capitalisée. */
export function formatDateLong(
  date: Date | string | number,
  locale: string = DEFAULT_LOCALE
): string {
  try {
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return FALLBACK
    const s = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
    return s.charAt(0).toUpperCase() + s.slice(1)
  } catch {
    return FALLBACK
  }
}

/** Date → "mai 2026" (FR) · "May 2026" (en-US). */
export function formatMonth(date: Date | string | number, locale: string = DEFAULT_LOCALE): string {
  try {
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return FALLBACK
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(d)
  } catch {
    return FALLBACK
  }
}
