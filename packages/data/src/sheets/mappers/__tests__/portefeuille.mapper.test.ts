import { describe, it, expect } from 'vitest'
import { mapPortefeuilleRows, mapAggregateRows } from '../portefeuille.mapper'
import type { PortefeuilleRowDTO } from '../../../types/sheets'

const CLUB = '11111111-1111-1111-1111-111111111111'

/** Fixture complète : tous les champs présents, null pour les numériques optionnels. */
function makeRow(overrides: Partial<PortefeuilleRowDTO> = {}): PortefeuilleRowDTO {
  return {
    name: 'Meta Platforms',
    symbol: 'NASDAQ:META',
    category: 'Action',
    quantity: 10,
    currency: 'USD',
    marketPriceEur: 500,
    marketValue: 5000,
    allocationPct: 12.5,
    pump: 400,
    bookValue: 4000,
    pe: 25,
    eps: 20,
    gainLossPct: 25,
    gainLossEur: 1000,
    sector: 'Tech',
    stopLossPct: -10,
    takeProfitPct: 30,
    perfCible: 30,
    perfCalibree: 28,
    stopLossValue: 450,
    takeProfitValue: 650,
    currencyRef: 'EUR',
    typologie: 'Croissance',
    ...overrides,
  }
}

describe('mapPortefeuilleRows', () => {
  it('mappe une ligne avec symbol vers positions (symbol + club_id)', () => {
    const { positions, aggregateRows } = mapPortefeuilleRows([makeRow()], CLUB)
    expect(positions).toHaveLength(1)
    expect(positions[0]!.symbol).toBe('NASDAQ:META')
    expect(positions[0]!.club_id).toBe(CLUB)
    expect(aggregateRows).toHaveLength(0)
  })

  it('mappe tous les champs métier en snake_case', () => {
    const { positions } = mapPortefeuilleRows([makeRow()], CLUB)
    const p = positions[0]!
    expect(p.market_price_eur).toBe(500)
    expect(p.currency_ref).toBe('EUR')
    expect(p.gain_loss_eur).toBe(1000)
    expect(p.take_profit_value).toBe(650)
    expect(p.typologie).toBe('Croissance')
  })

  it('ligne avec symbol vide → aggregateRows, exclue de positions', () => {
    const { positions, aggregateRows } = mapPortefeuilleRows([makeRow({ symbol: '' })], CLUB)
    expect(aggregateRows).toHaveLength(1)
    expect(positions).toHaveLength(0)
  })

  it('ligne avec symbol espaces uniquement → aggregateRows', () => {
    const { positions, aggregateRows } = mapPortefeuilleRows([makeRow({ symbol: '   ' })], CLUB)
    expect(aggregateRows).toHaveLength(1)
    expect(positions).toHaveLength(0)
  })

  it('sépare correctement un mélange positions/agrégats', () => {
    const { positions, aggregateRows } = mapPortefeuilleRows(
      [makeRow(), makeRow({ symbol: '' }), makeRow({ symbol: 'EURONEXT:AIR' })],
      CLUB
    )
    expect(positions).toHaveLength(2)
    expect(aggregateRows).toHaveLength(1)
  })
})

describe('mapAggregateRows', () => {
  it('mappe label/valeurs et porte le club_id', () => {
    const { aggregateRows } = mapPortefeuilleRows(
      [
        makeRow({
          symbol: '',
          name: 'Portefeuille',
          marketValue: 12000,
          bookValue: 9000,
          allocationPct: 100,
        }),
      ],
      CLUB
    )
    const out = mapAggregateRows(aggregateRows, CLUB)
    expect(out).toEqual([
      {
        club_id: CLUB,
        label: 'Portefeuille',
        market_value: 12000,
        book_value: 9000,
        allocation_pct: 100,
      },
    ])
  })

  it('écarte les lignes au libellé (name) vide ou espaces (clé onConflict label)', () => {
    const { aggregateRows } = mapPortefeuilleRows(
      [makeRow({ symbol: '', name: '' }), makeRow({ symbol: '', name: '   ' })],
      CLUB
    )
    expect(mapAggregateRows(aggregateRows, CLUB)).toHaveLength(0)
  })

  it('trim le libellé', () => {
    const { aggregateRows } = mapPortefeuilleRows(
      [makeRow({ symbol: '', name: '  Provision  ' })],
      CLUB
    )
    expect(mapAggregateRows(aggregateRows, CLUB)[0]!.label).toBe('Provision')
  })
})
