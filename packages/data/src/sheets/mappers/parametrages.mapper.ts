import { stripAccents } from '@evolve/utils'
import type { ParametragesRowDTO, ClubUpsert } from '../../types/sheets.ts'

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

/** Noms BRUTS des dirigeants extraits de PARAMETRAGES (pour réconciliation des rôles). */
export interface ClubOfficers {
  /** Nom complet du Président(e), ou null si absent de la feuille. */
  presidentName: string | null
  /** Nom complet du Trésorier(e), ou null si absent de la feuille. */
  treasurerName: string | null
}

/**
 * Extrait les noms des dirigeants (Président, Trésorier) de la feuille PARAMETRAGES.
 *
 * Séparé de `mapParametragesToClub` car ces noms ne sont PAS de la config club : ils
 * servent uniquement à la réconciliation des rôles côté `sync` (matching du nom vers
 * `users.full_name`). Le nom est renvoyé BRUT (non normalisé) ; la normalisation pour
 * le matching vit dans `normalizeName`, appliquée au moment du rapprochement.
 *
 * Feuille vide → dirigeants null (pas d'exception : l'absence de dirigeant n'est pas
 * une erreur dure ; le sync logge alors un warning et continue). Le Secrétaire n'est
 * PAS extrait (décision : pas de valeur 'secretary' dans l'enum member_role).
 */
export function mapParametragesToOfficers(rows: ParametragesRowDTO[]): ClubOfficers {
  const first = rows[0]
  if (!first) return { presidentName: null, treasurerName: null }
  const clean = (s: string | null | undefined): string | null => {
    const v = (s ?? '').trim()
    return v === '' ? null : v
  }
  return {
    presidentName: clean(first.presidentName),
    treasurerName: clean(first.treasurerName),
  }
}
