import type { OperationPosition, OperationPositionRow } from '../types.ts'

/** Nombre fini issu de `value` (accepte string/number), sinon `fallback`. */
function asFinite(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

/** Nombre fini issu de `value`, sinon `null` (jamais NaN). */
function asFiniteOrNull(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

/**
 * Mappe une ligne brute de `get_club_positions_from_ops` vers `OperationPosition`.
 *
 * Défensif (CLAUDE.md : jamais de NaN/undefined à l'écran ; fallback `null`/0) :
 *   - `total_quantity` / `cash_invested` absents ou non numériques → 0 ;
 *   - `last_unit_price` absent / non numérique → `null` ;
 *   - `symbol` / `currency` absents → `''` ; `asset_name` absent → `null` ;
 *   - les nombres peuvent arriver en `string` (numeric PostgREST) : `Number(...)` avec fallback.
 */
export function mapOperationPositionRow(
  row: Partial<OperationPositionRow> | null | undefined
): OperationPosition {
  return {
    symbol: row?.symbol != null ? String(row.symbol) : '',
    assetName: row?.asset_name != null ? String(row.asset_name) : null,
    currency: row?.currency != null ? String(row.currency) : '',
    totalQuantity: asFinite(row?.total_quantity, 0),
    lastUnitPrice: asFiniteOrNull(row?.last_unit_price),
    cashInvested: asFinite(row?.cash_invested, 0),
  }
}
