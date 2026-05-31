/** Retire les accents/diacritiques d'une chaîne (décomposition NFD). */
export function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '')
}
