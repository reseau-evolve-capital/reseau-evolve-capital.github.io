import { stripAccents } from '@evolve/utils'
import type { ParametragesRowDTO, ClubUpsert } from '../../types/sheets'

/**
 * Mappe les lignes de la feuille PARAMETRAGES vers la config d'un club.
 * Seule la première ligne porte la configuration. Le slug est dérivé du nom
 * (minuscule, accents retirés, espaces → tirets). Le taux de pénalité atterrit
 * dans settings.penalty_rate.
 */
export function mapParametragesToClub(rows: ParametragesRowDTO[], sheetId: string): ClubUpsert {
  const first = rows[0]
  if (!first) throw new Error('Feuille PARAMETRAGES vide : aucune ligne de configuration.')
  const slug = stripAccents(first.clubName.trim().toLowerCase())
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  return {
    name: first.clubName.trim(),
    slug,
    sheet_id: sheetId,
    min_contribution: first.minContribution,
    city: first.city ?? null,
    country: first.country ?? null,
    settings: { penalty_rate: first.penaltyRate ?? null },
  }
}
