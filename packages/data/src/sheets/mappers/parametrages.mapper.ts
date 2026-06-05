import { stripAccents } from '@evolve/utils'
import type { ParametragesRowDTO, ClubUpsert } from '../../types/sheets'

/**
 * Mappe les lignes de la feuille PARAMETRAGES vers la config d'un club.
 * Seule la première ligne porte la configuration. Le slug est dérivé du nom
 * (minuscule, accents retirés, espaces → tirets). Le taux de pénalité et le nom
 * du courtier atterrissent dans settings (pas de colonne dédiée). L'identifiant
 * courtier et le plafond annuel ont des colonnes propres (migration 022).
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
    // country reste nullable (migration 024) : saisi par l'admin/président plus tard.
    country: first.country ?? null,
    // TEXT brut : on conserve la string telle quelle (zéros non significatifs préservés).
    broker_account_ref: first.brokerAccountRef ?? null,
    // NUMERIC : déjà parsé en number côté parser (toNumOrNull).
    annual_investment_cap: first.annualInvestmentCap ?? null,
    settings: {
      penalty_rate: first.penaltyRate ?? null,
      broker_name: first.brokerName ?? null,
    },
  }
}
