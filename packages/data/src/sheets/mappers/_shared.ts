import { parseFrDate } from '@evolve/utils'

/** Date FR ("dd/mm/yyyy") → "yyyy-mm-dd" pour colonne Postgres DATE, ou null. PURE (Deno-safe). */
export function toIsoDate(input: string | null | undefined): string | null {
  const d = parseFrDate(input)
  return d ? d.toISOString().slice(0, 10) : null
}
