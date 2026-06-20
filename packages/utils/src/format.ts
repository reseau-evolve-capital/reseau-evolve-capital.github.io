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

/**
 * Formateur monétaire générique multi-devises.
 * `currency` : code ISO 4217 (ex. 'EUR', 'XOF', 'USD', 'CHF').
 * Cas limites : null / undefined / NaN / Infinity → "—".
 * Devise invalide : ne crash pas — fallback affiche le nombre + le code devise.
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: string,
  locale: string = DEFAULT_LOCALE
): string {
  if (value == null || !isValid(value)) return FALLBACK
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    // Devise inconnue d'Intl : affichage dégradé "1 234,56 XYZ"
    return (
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value) +
      ' ' +
      currency
    )
  }
}

/**
 * Renvoie le symbole d'une devise ISO 4217 (ex. 'EUR'→'€', 'USD'→'$', 'XOF'→'FCFA').
 * Utilise formatToParts pour extraire la partie 'currency'.
 * Fallback sur le code devise si introuvable ou si la devise est inconnue d'Intl.
 */
export function currencySymbol(currency: string, locale: string = DEFAULT_LOCALE): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0)
    const part = parts.find((p) => p.type === 'currency')
    return part?.value ?? currency
  } catch {
    return currency
  }
}

/** 65574.87 → "65 574,87 €" (FR) · "€65,574.87" (en-US). Alias de formatCurrency('EUR'). */
export function formatEUR(
  value: number | null | undefined,
  locale: string = DEFAULT_LOCALE
): string {
  return formatCurrency(value, 'EUR', locale)
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
