import type {
  Operation,
  OperationRow,
  OperationSource,
  OperationStatus,
  OperationType,
} from '../types.ts'

const OPERATION_TYPES: readonly OperationType[] = [
  'contribution',
  'member_exit',
  'buy',
  'sell',
  'dividend_cash',
  'dividend_stock',
  'fee',
  'penalty',
  'capital_call',
  'distribution',
  'valuation',
  'correction',
]

const OPERATION_STATUSES: readonly OperationStatus[] = ['pending', 'confirmed', 'cancelled']

const OPERATION_SOURCES: readonly OperationSource[] = [
  'manual',
  'matrice_migration',
  'matrice_sync',
]

function asType(v: string | null | undefined): OperationType {
  return v != null && (OPERATION_TYPES as readonly string[]).includes(v)
    ? (v as OperationType)
    : 'correction'
}

function asStatus(v: string | null | undefined): OperationStatus {
  return v != null && (OPERATION_STATUSES as readonly string[]).includes(v)
    ? (v as OperationStatus)
    : 'pending'
}

function asSource(v: string | null | undefined): OperationSource {
  return v != null && (OPERATION_SOURCES as readonly string[]).includes(v)
    ? (v as OperationSource)
    : 'manual'
}

/** Nombre fini, ou `null` (jamais NaN). Protège des `cash_delta`/`quantity` sales. */
function asFiniteOrNull(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/**
 * Mappe une ligne brute `operations` vers le DTO métier `Operation`.
 *
 * Défensif (CLAUDE.md : jamais de NaN/undefined à l'écran ; fallback `null`) :
 *   - `cash_delta` null/NaN → 0 (la colonne est NOT NULL DEFAULT 0 : 0 est le neutre) ;
 *   - `symbol`/`asset_name`/`quantity`/`unit_price`/… absents → `null` propre ;
 *   - `type`/`status`/`source` inconnus → fallback (`correction`/`pending`/`manual`) ;
 *   - `metadata` null → `{}` (jamais `undefined`) ;
 *   - une opération annulée (`is_cancelled`) est exposée telle quelle, avec motif/horodatage.
 */
export function mapOperationRow(row: OperationRow): Operation {
  const metadata =
    row.metadata != null && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {}

  return {
    id: row.id,
    clubId: row.club_id,
    membershipId: row.membership_id ?? null,
    type: asType(row.type),
    status: asStatus(row.status),
    source: asSource(row.source),
    cashDelta: asFiniteOrNull(row.cash_delta) ?? 0,
    symbol: row.symbol ?? null,
    assetName: row.asset_name ?? null,
    quantity: asFiniteOrNull(row.quantity),
    unitPrice: asFiniteOrNull(row.unit_price),
    currency: row.currency ?? null,
    fxRate: asFiniteOrNull(row.fx_rate),
    operationDate: row.operation_date,
    settlementDate: row.settlement_date ?? null,
    recordedAt: row.recorded_at,
    recordedBy: row.recorded_by ?? null,
    partsAllocated: asFiniteOrNull(row.parts_allocated),
    partPriceAtSettlement: asFiniteOrNull(row.part_price_at_settlement),
    brokerReference: row.broker_reference ?? null,
    notes: row.notes ?? null,
    isCancelled: row.is_cancelled === true,
    cancelledAt: row.cancelled_at ?? null,
    cancelledBy: row.cancelled_by ?? null,
    cancellationReason: row.cancellation_reason ?? null,
    correctsOperationId: row.corrects_operation_id ?? null,
    metadata,
  }
}
