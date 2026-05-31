import type { CotisationsRowDTO, ContributionUpsert, MembershipLookup } from '../../types/sheets'

/**
 * Mappe "À jour"/"ok" → 'ok', "retard"/"late" → 'late', "exempt" → 'exempt'.
 * Renvoie `null` pour une valeur non vide non reconnue (le caller la collecte dans
 * `unknownStatuses` et retombe sur 'pending'). Une valeur vide/blanche → 'pending'
 * sans signalement (champ légitimement vierge dans la Sheet).
 */
function mapContributionStatus(s: string | null): ContributionUpsert['status'] | null {
  const v = (s ?? '').trim().toLowerCase()
  if (v === '') return 'pending'
  if (v === 'ok' || v === 'à jour' || v === 'a jour') return 'ok'
  if (v === 'late' || v === 'retard' || v === 'en retard') return 'late'
  if (v === 'exempt' || v === 'exempté' || v === 'exempte') return 'exempt'
  return null
}

/**
 * Mappe la feuille "Cotisations" ; matching strict lower(full_name), non matchés → unmatched[].
 * Les statuts non vides non reconnus sont collectés dans `unknownStatuses[]` (valeur brute) et
 * retombent sur 'pending'.
 */
export function mapCotisationsRows(
  rows: CotisationsRowDTO[],
  clubId: string,
  memberships: MembershipLookup[]
): { contributions: ContributionUpsert[]; unmatched: string[]; unknownStatuses: string[] } {
  const byName = new Map(memberships.map((m) => [m.full_name.trim().toLowerCase(), m]))
  const contributions: ContributionUpsert[] = []
  const unmatched: string[] = []
  const unknownStatuses: string[] = []
  for (const row of rows) {
    const m = byName.get(row.fullName.trim().toLowerCase())
    if (!m) {
      unmatched.push(row.fullName)
      continue
    }
    const mapped = mapContributionStatus(row.status)
    // mapped === null ⇒ statut non vide non reconnu ⇒ row.status est forcément une string.
    if (mapped === null) unknownStatuses.push(row.status ?? '')
    contributions.push({
      membership_id: m.id,
      club_id: clubId,
      months_count: row.monthsCount ?? 0,
      detention_pct: row.detentionPct ?? 0,
      total_contributed: row.totalContributed ?? 0,
      penalties: row.penalties ?? 0,
      net_market_value: row.netMarketValue,
      status: mapped ?? 'pending',
      amount_due: row.amountDue ?? 0,
    })
  }
  return { contributions, unmatched, unknownStatuses }
}
