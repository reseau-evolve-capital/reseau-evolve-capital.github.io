// Barrel module Opérations (@evolve/data/operations) — OPS-107 (migration 057).
//
// Expose les helpers de lecture RLS (solde de trésorerie + opérations récentes),
// le mapper row → DTO, et les types métier.

export { getClubCashBalance, listRecentOperations } from './client.ts'
export { mapOperationRow } from './mappers/operation.mapper.ts'
export type {
  Operation,
  OperationRow,
  OperationType,
  OperationStatus,
  OperationSource,
} from './types.ts'
