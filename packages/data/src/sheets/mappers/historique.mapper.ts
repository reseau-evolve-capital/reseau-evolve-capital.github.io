import { stripAccents } from '@evolve/utils'
import type { HistoriqueRowDTO, TransactionUpsert } from '../../types/sheets.ts'
import { toIsoDate } from './_shared.ts'

// Clés NORMALISÉES (trim + minuscule + sans accent) : la matrice mélange « Achat » et
// « ACHAT », « Vente » et « VENTE »… On matche sur la forme normalisée pour ne jamais
// reléguer une vente en 'other' à cause de la casse. Inconnu/vide → 'other' (jamais d'exception).
const TYPE_MAP: Record<string, TransactionUpsert['type']> = {
  achat: 'buy',
  vente: 'sell',
  dividende: 'dividend',
  coupon: 'coupon',
}

function mapType(raw: string | null): TransactionUpsert['type'] {
  const key = stripAccents((raw ?? '').trim().toLowerCase())
  return TYPE_MAP[key] ?? 'other'
}

/** Mappe les lignes de la feuille "Historique" en transactions upsertables. */
export function mapHistoriqueRows(rows: HistoriqueRowDTO[], clubId: string): TransactionUpsert[] {
  return rows.map((row) => ({
    club_id: clubId,
    type: mapType(row.type),
    symbol: row.symbol,
    name: row.name,
    quantity: row.quantity,
    price: row.price,
    total: row.total,
    transaction_date: toIsoDate(row.transactionDate),
    notes: row.notes,
  }))
}
