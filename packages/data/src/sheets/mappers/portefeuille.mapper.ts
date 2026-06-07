import type { PortefeuilleRowDTO, PositionUpsert, AggregateUpsert } from '../../types/sheets.ts'

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
      // positions.currency est NOT NULL DEFAULT 'EUR' en DB (migration 005) :
      // on pose 'EUR' par défaut ici pour ne jamais transmettre de null (qui
      // écraserait le défaut de la colonne et violerait la contrainte NOT NULL).
      currency: row.currency ?? 'EUR',
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

/**
 * Mappe les lignes d'agrégat (PortefeuilleRowDTO à symbole vide) vers des AggregateUpsert
 * persistables dans `portfolio_aggregates`. Filtre les lignes au libellé (`name`) vide :
 * la clé onConflict est (club_id, label), un label vide n'a pas de sens et créerait des
 * collisions. Le matching se fait par LABEL (col A), jamais par index.
 */
export function mapAggregateRows(
  aggregateRows: PortefeuilleRowDTO[],
  clubId: string
): AggregateUpsert[] {
  const result: AggregateUpsert[] = []
  for (const row of aggregateRows) {
    const label = (row.name ?? '').trim()
    if (label === '') continue
    result.push({
      club_id: clubId,
      label,
      market_value: row.marketValue,
      book_value: row.bookValue,
      allocation_pct: row.allocationPct,
    })
  }
  return result
}
