import type { PortefeuilleRowDTO, PositionUpsert } from '../../types/sheets'

/** Sépare les positions réelles des lignes d'agrégat (symbol vide → snapshot). */
export function mapPortefeuilleRows(
  rows: PortefeuilleRowDTO[],
  clubId: string
): { positions: PositionUpsert[]; aggregateRows: PortefeuilleRowDTO[] } {
  const positions: PositionUpsert[] = []
  const aggregateRows: PortefeuilleRowDTO[] = []
  for (const row of rows) {
    const symbol = (row.symbol ?? '').trim()
    if (symbol === '') {
      aggregateRows.push(row)
      continue
    }
    positions.push({
      club_id: clubId,
      name: row.name,
      symbol,
      category: row.category,
      sector: row.sector,
      typologie: row.typologie,
      quantity: row.quantity,
      currency: row.currency,
      currency_ref: row.currencyRef,
      market_price_eur: row.marketPriceEur,
      market_value: row.marketValue,
      book_value: row.bookValue,
      allocation_pct: row.allocationPct,
      pump: row.pump,
      pe: row.pe,
      eps: row.eps,
      gain_loss_pct: row.gainLossPct,
      gain_loss_eur: row.gainLossEur,
      stop_loss_pct: row.stopLossPct,
      take_profit_pct: row.takeProfitPct,
      perf_cible: row.perfCible,
      perf_calibree: row.perfCalibree,
      stop_loss_value: row.stopLossValue,
      take_profit_value: row.takeProfitValue,
    })
  }
  return { positions, aggregateRows }
}
