// Types module Opérations (OPS-107 ; migration 057_operations.sql).
//
// Pattern DTO strict du projet : `OperationRow` est dérivé tel quel de `types.gen.ts`
// (source de vérité du schéma), et le mapper (mappers/operation.mapper.ts) produit le
// type métier `Operation` en camelCase, strictement typé et défensif (jamais de NaN /
// undefined ; fallback `null`). Un changement de structure de la table ne touche que
// le mapper. Ne JAMAIS réécrire les colonnes ici : on les importe de Database.

import type { Database } from '../supabase/types.gen.ts'

/** Ligne brute de la table `operations`, telle que générée par Supabase. */
export type OperationRow = Database['public']['Tables']['operations']['Row']

/**
 * Nature d'une opération (CHECK operations.type).
 * Contributions / sorties affectent le cash et/ou les parts ; buy/sell/dividendes
 * concernent les titres ; fee/penalty/capital_call/distribution/valuation/correction
 * couvrent la trésorerie et les ajustements.
 */
export type OperationType =
  | 'contribution'
  | 'member_exit'
  | 'buy'
  | 'sell'
  | 'dividend_cash'
  | 'dividend_stock'
  | 'fee'
  | 'penalty'
  | 'capital_call'
  | 'distribution'
  | 'valuation'
  | 'correction'

/** Cycle de vie d'une opération (CHECK operations.status). */
export type OperationStatus = 'pending' | 'confirmed' | 'cancelled'

/** Origine d'une opération (CHECK operations.source). */
export type OperationSource = 'manual' | 'matrice_migration' | 'matrice_sync'

/**
 * Opération métier — sortie du mapper. camelCase, champs strictement typés.
 *
 * Conventions (CLAUDE.md « jamais de NaN/undefined à l'écran ») :
 *   - `cashDelta` : toujours un `number` (la colonne est NOT NULL DEFAULT 0) ;
 *   - les champs financiers/titres absents (`symbol`, `quantity`, `unitPrice`, …) → `null` propre ;
 *   - `type` / `status` / `source` inconnus → fallback sûr (`correction` / `pending` / `manual`) ;
 *   - `isCancelled` reflète l'annulation, avec son motif/horodatage le cas échéant ;
 *   - `metadata` : objet brut (jsonb), jamais `undefined`.
 */
export interface Operation {
  id: string
  clubId: string
  membershipId: string | null
  type: OperationType
  status: OperationStatus
  source: OperationSource
  /** Flux de trésorerie signé (NOT NULL DEFAULT 0) : > 0 entrée, < 0 sortie. */
  cashDelta: number
  symbol: string | null
  assetName: string | null
  quantity: number | null
  unitPrice: number | null
  currency: string | null
  fxRate: number | null
  /** Date comptable de l'opération (date ISO `YYYY-MM-DD`). */
  operationDate: string
  /** Date de règlement effectif (peut différer de la date d'opération). */
  settlementDate: string | null
  recordedAt: string
  recordedBy: string | null
  /** Parts allouées au membre lors du règlement (contributions / sorties). */
  partsAllocated: number | null
  /** Valeur de part au moment du règlement. */
  partPriceAtSettlement: number | null
  brokerReference: string | null
  notes: string | null
  /** Annulation logique (l'opération reste en base pour l'audit). */
  isCancelled: boolean
  cancelledAt: string | null
  cancelledBy: string | null
  cancellationReason: string | null
  /** Opération corrigée par celle-ci, le cas échéant (chaîne de corrections). */
  correctsOperationId: string | null
  metadata: Record<string, unknown>
}

/** Ligne brute de la RPC `get_club_positions_from_ops` (positions agrégées depuis les ops). */
export type OperationPositionRow =
  Database['public']['Functions']['get_club_positions_from_ops']['Returns'][number]

/**
 * Position agrégée d'un titre, dérivée des opérations buy/sell (RPC
 * `get_club_positions_from_ops`, migration 060). Sortie du mapper : camelCase, défensif.
 *
 * Conventions (CLAUDE.md « jamais de NaN/undefined à l'écran ») :
 *   - `totalQuantity` / `cashInvested` : toujours un `number` fini (fallback 0) ;
 *   - `lastUnitPrice` : `number` fini ou `null` si absent/non numérique ;
 *   - `assetName` : `null` propre si absent ; `symbol` / `currency` : `string` (fallback '').
 */
export interface OperationPosition {
  symbol: string
  assetName: string | null
  currency: string
  totalQuantity: number
  lastUnitPrice: number | null
  cashInvested: number
}
