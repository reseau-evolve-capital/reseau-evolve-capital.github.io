import { describe, expect, it } from 'vitest'
import { mapOperationRow } from './operation.mapper.ts'
import type { OperationRow } from '../types.ts'

/** Ligne brute complète et « propre » servant de base aux variations de test. */
function baseRow(overrides: Partial<OperationRow> = {}): OperationRow {
  return {
    id: 'op-1',
    club_id: 'club-1',
    membership_id: 'mem-1',
    type: 'buy',
    status: 'confirmed',
    source: 'manual',
    cash_delta: -1500,
    symbol: 'NASDAQ:META',
    asset_name: 'Meta Platforms',
    quantity: 3,
    unit_price: 500,
    currency: 'EUR',
    fx_rate: null,
    operation_date: '2026-06-01',
    settlement_date: '2026-06-03',
    recorded_at: '2026-06-01T10:00:00Z',
    recorded_by: 'mem-staff',
    parts_allocated: null,
    part_price_at_settlement: null,
    broker_reference: 'BRK-42',
    notes: null,
    is_cancelled: false,
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
    corrects_operation_id: null,
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-01T10:00:00Z',
    metadata: {},
    ...overrides,
  }
}

describe('mapOperationRow', () => {
  it('mappe une ligne complète vers le DTO camelCase', () => {
    const op = mapOperationRow(baseRow())
    expect(op).toEqual({
      id: 'op-1',
      clubId: 'club-1',
      membershipId: 'mem-1',
      type: 'buy',
      status: 'confirmed',
      source: 'manual',
      cashDelta: -1500,
      symbol: 'NASDAQ:META',
      assetName: 'Meta Platforms',
      quantity: 3,
      unitPrice: 500,
      currency: 'EUR',
      fxRate: null,
      operationDate: '2026-06-01',
      settlementDate: '2026-06-03',
      recordedAt: '2026-06-01T10:00:00Z',
      recordedBy: 'mem-staff',
      partsAllocated: null,
      partPriceAtSettlement: null,
      brokerReference: 'BRK-42',
      notes: null,
      isCancelled: false,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      correctsOperationId: null,
      metadata: {},
    })
  })

  it('cash_delta null → 0 (jamais NaN/undefined)', () => {
    // Le type généré dit `number`, mais on se protège des données sales en runtime.
    const op = mapOperationRow(baseRow({ cash_delta: null as unknown as number }))
    expect(op.cashDelta).toBe(0)
    expect(Number.isNaN(op.cashDelta)).toBe(false)
  })

  it('symbol/quantity/unit_price absents → null propre', () => {
    const op = mapOperationRow(
      baseRow({ symbol: null, quantity: null, unit_price: null, asset_name: null })
    )
    expect(op.symbol).toBeNull()
    expect(op.quantity).toBeNull()
    expect(op.unitPrice).toBeNull()
    expect(op.assetName).toBeNull()
  })

  it('opération annulée exposée comme telle, avec motif/horodatage', () => {
    const op = mapOperationRow(
      baseRow({
        status: 'cancelled',
        is_cancelled: true,
        cancelled_at: '2026-06-04T12:00:00Z',
        cancelled_by: 'mem-staff',
        cancellation_reason: 'erreur de saisie',
      })
    )
    expect(op.isCancelled).toBe(true)
    expect(op.status).toBe('cancelled')
    expect(op.cancelledAt).toBe('2026-06-04T12:00:00Z')
    expect(op.cancelledBy).toBe('mem-staff')
    expect(op.cancellationReason).toBe('erreur de saisie')
  })

  it('type/status/source inconnus → fallback sûr', () => {
    const op = mapOperationRow(
      baseRow({
        type: 'wat' as unknown as OperationRow['type'],
        status: 'zzz' as unknown as OperationRow['status'],
        source: 'inconnu' as unknown as OperationRow['source'],
      })
    )
    expect(op.type).toBe('correction')
    expect(op.status).toBe('pending')
    expect(op.source).toBe('manual')
  })

  it('metadata null → objet vide (jamais undefined)', () => {
    const op = mapOperationRow(baseRow({ metadata: null as unknown as OperationRow['metadata'] }))
    expect(op.metadata).toEqual({})
  })

  it('ne produit aucun NaN/undefined sur une ligne dégradée', () => {
    const dirty = {
      id: 'op-x',
      club_id: 'club-x',
      operation_date: '2026-06-10',
      recorded_at: '2026-06-10T00:00:00Z',
    } as unknown as OperationRow
    const op = mapOperationRow(dirty)
    for (const value of Object.values(op)) {
      expect(value === undefined).toBe(false)
      if (typeof value === 'number') expect(Number.isNaN(value)).toBe(false)
    }
    expect(op.cashDelta).toBe(0)
    expect(op.metadata).toEqual({})
  })
})
