import { parseFrMonth, toNumOrNull } from '@evolve/utils'
import type { ContributionMonthUpsert, MembershipLookup } from '../../types/sheets'

/**
 * Parse la feuille "Details cotisations".
 * - rows[0] = en-têtes ; col 0 = "Periode", col 1 = "100" (ignorée), cols 2..n = noms complets
 * - chaque ligne de données : col 0 = période ("juin 2018"), cols 2..n = montants par membre
 * - statut : montant > 0 → 'paid' ; sinon période passée → 'late' ; future → 'due'
 * - matching strict lower(full_name) ; en-têtes non résolus → unmatched[]
 */
export function mapDetailsCotisationsRows(
  rows: string[][],
  clubId: string,
  memberships: MembershipLookup[],
  now: Date
): { months: ContributionMonthUpsert[]; unmatched: string[] } {
  const months: ContributionMonthUpsert[] = []
  const unmatchedSet = new Set<string>()
  const headers = rows[0]
  if (!headers) return { months, unmatched: [] }

  const byName = new Map(memberships.map((m) => [m.full_name.trim().toLowerCase(), m]))
  // index colonne → membership (cols 2..n-1, en sautant l'en-tête "100")
  const colToMember = new Map<number, MembershipLookup>()
  for (let c = 2; c < headers.length; c++) {
    const header = (headers[c] ?? '').trim()
    if (header === '' || header === '100') continue
    const m = byName.get(header.toLowerCase())
    if (m) colToMember.set(c, m)
    else unmatchedSet.add(header)
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row) continue
    const parsed = parseFrMonth(row[0] ?? '')
    if (!parsed) continue
    const { year, month } = parsed
    const periodPassed =
      year < now.getUTCFullYear() ||
      (year === now.getUTCFullYear() && month <= now.getUTCMonth() + 1)
    for (const [c, m] of colToMember) {
      const amount = toNumOrNull(row[c] ?? '')
      const status: ContributionMonthUpsert['status'] =
        amount != null && amount > 0 ? 'paid' : periodPassed ? 'late' : 'due'
      months.push({
        membership_id: m.id,
        club_id: clubId,
        year,
        month,
        amount: amount ?? 0,
        status,
        due_date: null,
      })
    }
  }
  return { months, unmatched: [...unmatchedSet] }
}
