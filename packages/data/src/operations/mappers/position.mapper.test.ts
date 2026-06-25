import { describe, expect, it } from 'vitest'
import { mapOperationPositionRow } from './position.mapper.ts'
import type { OperationPositionRow } from '../types.ts'

function baseRow(overrides: Partial<OperationPositionRow> = {}): OperationPositionRow {
  return {
    symbol: 'NASDAQ:META',
    asset_name: 'Meta Platforms',
    currency: 'EUR',
    total_quantity: 12,
    last_unit_price: 500,
    cash_invested: 6000,
    ...overrides,
  }
}

describe('mapOperationPositionRow', () => {
  it('mappe une ligne complète vers le DTO camelCase', () => {
    expect(mapOperationPositionRow(baseRow())).toEqual({
      symbol: 'NASDAQ:META',
      assetName: 'Meta Platforms',
      currency: 'EUR',
      totalQuantity: 12,
      lastUnitPrice: 500,
      cashInvested: 6000,
    })
  })

  it('nombres en string (numeric PostgREST) → number fini', () => {
    const pos = mapOperationPositionRow(
      baseRow({
        total_quantity: '12.5' as unknown as number,
        last_unit_price: '499.99' as unknown as number,
        cash_invested: '6249.88' as unknown as number,
      })
    )
    expect(pos.totalQuantity).toBe(12.5)
    expect(pos.lastUnitPrice).toBe(499.99)
    expect(pos.cashInvested).toBe(6249.88)
  })

  it('total_quantity/cash_invested null → 0 (jamais NaN)', () => {
    const pos = mapOperationPositionRow(
      baseRow({
        total_quantity: null as unknown as number,
        cash_invested: null as unknown as number,
      })
    )
    expect(pos.totalQuantity).toBe(0)
    expect(pos.cashInvested).toBe(0)
    expect(Number.isNaN(pos.totalQuantity)).toBe(false)
    expect(Number.isNaN(pos.cashInvested)).toBe(false)
  })

  it('last_unit_price null/non numérique → null', () => {
    expect(
      mapOperationPositionRow(baseRow({ last_unit_price: null as unknown as number })).lastUnitPrice
    ).toBeNull()
    expect(
      mapOperationPositionRow(baseRow({ last_unit_price: 'N/A' as unknown as number }))
        .lastUnitPrice
    ).toBeNull()
  })

  it('valeurs NaN → fallback (0 ou null, jamais NaN)', () => {
    const pos = mapOperationPositionRow(
      baseRow({
        total_quantity: Number.NaN,
        last_unit_price: Number.NaN,
        cash_invested: Number.NaN,
      })
    )
    expect(pos.totalQuantity).toBe(0)
    expect(pos.lastUnitPrice).toBeNull()
    expect(pos.cashInvested).toBe(0)
  })

  it('symbol/currency absents → chaîne vide ; asset_name absent → null', () => {
    const pos = mapOperationPositionRow(
      baseRow({
        symbol: null as unknown as string,
        currency: null as unknown as string,
        asset_name: null as unknown as string,
      })
    )
    expect(pos.symbol).toBe('')
    expect(pos.currency).toBe('')
    expect(pos.assetName).toBeNull()
  })

  it('ligne null/undefined → DTO neutre sans NaN/undefined', () => {
    for (const input of [null, undefined]) {
      const pos = mapOperationPositionRow(input)
      expect(pos).toEqual({
        symbol: '',
        assetName: null,
        currency: '',
        totalQuantity: 0,
        lastUnitPrice: null,
        cashInvested: 0,
      })
    }
  })
})
