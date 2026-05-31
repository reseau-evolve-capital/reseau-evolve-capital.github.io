import type { CotisationsRowDTO, ContributionUpsert, MembershipLookup } from '../../types/sheets'

/** Mappe "À jour"/"ok" → 'ok', "retard"/"late" → 'late', "exempt" → 'exempt', sinon 'pending'. */
function mapContributionStatus(s: string | null): ContributionUpsert['status'] {
  const v = (s ?? '').trim().toLowerCase()
  if (v === 'ok' || v === 'à jour' || v === 'a jour') return 'ok'
  if (v === 'late' || v === 'retard' || v === 'en retard') return 'late'
  if (v === 'exempt' || v === 'exempté' || v === 'exempte') return 'exempt'
  return 'pending'
}

/** Mappe la feuille "Cotisations" ; matching strict lower(full_name), non matchés → unmatched[]. */
export function mapCotisationsRows(
  rows: CotisationsRowDTO[],
  clubId: string,
  memberships: MembershipLookup[]
): { contributions: ContributionUpsert[]; unmatched: string[] } {
  const byName = new Map(memberships.map((m) => [m.full_name.trim().toLowerCase(), m]))
  const contributions: ContributionUpsert[] = []
  const unmatched: string[] = []
  for (const row of rows) {
    const m = byName.get(row.fullName.trim().toLowerCase())
    if (!m) {
      unmatched.push(row.fullName)
      continue
    }
    contributions.push({
      membership_id: m.id,
      club_id: clubId,
      months_count: row.monthsCount ?? 0,
      detention_pct: row.detentionPct ?? 0,
      total_contributed: row.totalContributed ?? 0,
      penalties: row.penalties ?? 0,
      net_market_value: row.netMarketValue,
      status: mapContributionStatus(row.status),
      amount_due: row.amountDue ?? 0,
    })
  }
  return { contributions, unmatched }
}
