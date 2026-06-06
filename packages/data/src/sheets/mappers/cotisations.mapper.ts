import { stripAccents } from '@evolve/utils'
import type { CotisationsRowDTO, ContributionUpsert, MembershipLookup } from '../../types/sheets'

/**
 * Mappe le libellé de statut de la feuille "Cotisations" vers l'enum métier.
 * Normalisation TOLÉRANTE : trim + minuscule + accents retirés, pour absorber les
 * variations de casse/accents de la Sheet (« Situation régulière » ≡ « situation reguliere »).
 *
 * Libellés réels de la matrice : "Situation régulière" → 'ok', "Situation irrégulière" → 'late'
 * (l'« irrégulière » étant matchée AVANT « régulière », car elle la contient en sous-chaîne).
 * Rétro-compat conservée : "À jour"/"ok" → 'ok', "retard"/"late" → 'late', "exempt" → 'exempt'.
 *
 * Renvoie `null` pour une valeur non vide non reconnue (ex. `#ERROR!`) : le caller la collecte
 * dans `unknownStatuses` et retombe sur 'pending' — JAMAIS d'exception sur une cellule sale.
 * Une valeur vide/blanche → 'pending' sans signalement (champ légitimement vierge).
 */
function mapContributionStatus(s: string | null): ContributionUpsert['status'] | null {
  const v = stripAccents((s ?? '').trim().toLowerCase())
  if (v === '') return 'pending'
  // « irreguliere » contient « reguliere » → tester l'irrégulier d'abord.
  if (v.includes('irreguliere')) return 'late'
  if (v.includes('reguliere')) return 'ok'
  if (v === 'ok' || v === 'a jour') return 'ok'
  if (v === 'late' || v === 'retard' || v === 'en retard') return 'late'
  if (v === 'exempt' || v === 'exempte') return 'exempt'
  return null
}

/**
 * Mappe la feuille "Cotisations" ; matching strict lower(full_name), non matchés → unmatched[].
 * Les statuts non vides non reconnus sont collectés dans `unknownStatuses[]` (valeur brute) et
 * retombent sur 'pending'.
 *
 * `detention_pct` : la feuille fournit un POURCENTAGE ("8,99%" → toNumOrNull = 8.99) ; la colonne
 * `contributions.detention_pct` (DATA_MODEL §2 : NUMERIC, « 0.12345 = 12,345 % ») et tout le
 * frontend (`lib/data/contributions.ts`, `formatPct`) attendent une FRACTION 0..1. On divise donc
 * par 100 ici — convention pct÷100 unique au point d'ingestion.
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
      // % de la feuille → fraction 0..1 (cf. note ci-dessus). null → 0.
      detention_pct: row.detentionPct != null ? row.detentionPct / 100 : 0,
      total_contributed: row.totalContributed ?? 0,
      penalties: row.penalties ?? 0,
      net_market_value: row.netMarketValue,
      status: mapped ?? 'pending',
      amount_due: row.amountDue ?? 0,
    })
  }
  return { contributions, unmatched, unknownStatuses }
}
