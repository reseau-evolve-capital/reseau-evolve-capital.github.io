import { parseFrDate } from '@evolve/utils'
import type { HistoriqueRowDTO, TransactionUpsert } from '../../types/sheets'

const TYPE_MAP: Record<string, TransactionUpsert['type']> = {
  Achat: 'buy',
  Vente: 'sell',
  Dividende: 'dividend',
  Coupon: 'coupon',
}

/** Convertit une date FR "jj/mm/aaaa" en ISO "yyyy-mm-dd", ou null si invalide. */
function toIsoDate(input: string | null): string | null {
  const d = parseFrDate(input)
  return d ? d.toISOString().slice(0, 10) : null
}

/** Mappe les lignes de la feuille "Historique" en transactions upsertables. */
export function mapHistoriqueRows(rows: HistoriqueRowDTO[], clubId: string): TransactionUpsert[] {
  return rows.map((row) => ({
    club_id: clubId,
    type: TYPE_MAP[(row.type ?? '').trim()] ?? 'other',
    symbol: row.symbol,
    name: row.name,
    quantity: row.quantity,
    price: row.price,
    total: row.total,
    transaction_date: toIsoDate(row.transactionDate),
    notes: row.notes,
  }))
}
