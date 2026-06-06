/** Retire les accents/diacritiques d'une chaîne (décomposition NFD). */
export function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Slug DÉTERMINISTE et idempotent à partir d'un texte libre.
 * Sans accent, minuscule, espaces/ponctuation → tiret unique, bornes nettoyées.
 * Ex. « OURO SAMA Jalil » → "ouro-sama-jalil". Une entrée vide → "" (l'appelant décide du fallback).
 * Conçu pour fabriquer des identifiants stables entre exécutions (ex. email placeholder à l'import).
 */
export function slugify(input: string): string {
  return stripAccents(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // tout ce qui n'est pas alphanum → tiret
    .replace(/^-+|-+$/g, '') // pas de tiret en bordure
}
