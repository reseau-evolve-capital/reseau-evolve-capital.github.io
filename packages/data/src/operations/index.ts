// Barrel module Opérations (@evolve/data/operations) — OPS-107 (migration 057).
//
// Expose les helpers de lecture RLS (solde de trésorerie + opérations récentes),
// le mapper row → DTO, et les types métier.

export {
  getClubCashBalance,
  listRecentOperations,
  listOperations,
  getClubPositionsFromOps,
} from './client.ts'
export type { ListOperationsOptions } from './client.ts'
export { mapOperationRow } from './mappers/operation.mapper.ts'
export { mapOperationPositionRow } from './mappers/position.mapper.ts'
export type {
  Operation,
  OperationRow,
  OperationType,
  OperationStatus,
  OperationSource,
  OperationPosition,
  OperationPositionRow,
} from './types.ts'
