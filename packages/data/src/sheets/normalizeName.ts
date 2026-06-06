import { stripAccents } from '@evolve/utils'

/**
 * Forme NORMALISÉE d'un nom de personne, destinée au MATCHING (jamais à l'affichage).
 *
 * Règle : minuscule + accents retirés + trim + espaces internes compactés en un seul.
 * Idempotente et déterministe : `normalizeName(normalizeName(x)) === normalizeName(x)`.
 *
 * Usage : rapprocher un nom issu d'une feuille Google Sheets (ex. dirigeants listés
 * dans PARAMETRAGES) d'un `users.full_name` en base, malgré les écarts de casse,
 * d'accents ou d'espacement. On NE slugifie PAS (pas de tirets) : on veut comparer des
 * noms « humains » mot à mot, pas fabriquer un identifiant.
 *
 * Ex. « HOUESSOU Valentino » ≡ « houessou valentino » ≡ «  Houéssou   Valentino  ».
 * Entrée nullish ou vide → '' (l'appelant décide quoi faire d'un nom absent).
 */
export function normalizeName(input: string | null | undefined): string {
  if (input == null) return ''
  return stripAccents(input).toLowerCase().trim().replace(/\s+/g, ' ')
}
