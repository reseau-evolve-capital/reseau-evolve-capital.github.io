import type { HistoriqueRowDTO, TransactionUpsert } from '../../types/sheets'
import { toIsoDate } from './_shared'

const TYPE_MAP: Record<string, TransactionUpsert['type']> = {
  Achat: 'buy',
  Vente: 'sell',
  Dividende: 'dividend',
  Coupon: 'coupon',
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
