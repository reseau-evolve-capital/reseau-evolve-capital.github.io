// Couche data du module Opérations trésorier (E-OPS-2), côté apps/web.
//
// Petits helpers de LECTURE RLS-safe (session, jamais service-role) qui complètent les helpers
// @evolve/data (getClubCashBalance, listRecentOperations, listOperations) :
//   - membres ACTIFS du club pour le select « Membre » de l'assistant ;
//   - cotisation minimale du club (hint non bloquant du formulaire) ;
//   - adaptateurs Operation (DTO @evolve/data) → formes présentationnelles @evolve/ui
//     (OperationListItemData / OperationDetail).
//
// Réf : lib/data/admin.ts (getClubMembers), packages/data/src/operations.

import type { createServerClient } from '@evolve/data'
import type { Operation, OperationSource, OperationStatus } from '@evolve/data'
import type { OperationListItemData, OperationDetail, OperationItemStatus } from '@evolve/ui'

type ServerClient = ReturnType<typeof createServerClient>

/** Membre actif simplifié pour le select de l'assistant ({ id: membership_id, label: nom }). */
export interface ActiveMemberOption {
  id: string
  label: string
}

/**
 * Membres ACTIFS du club (statut d'adhésion `active`), triés par nom. RLS treasurer.
 * Le select de l'assistant ne propose QUE les membres actifs (un membre sorti ne cotise plus).
 */
export async function getActiveClubMemberOptions(
  supabase: ServerClient,
  clubId: string
): Promise<ActiveMemberOption[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('id, status, users!memberships_user_id_fkey!inner(full_name)')
    .eq('club_id', clubId)
    .eq('status', 'active')
    .returns<{ id: string; status: string; users: { full_name: string } }[]>()
  if (error || data == null) return []
  return data
    .map((m) => ({ id: m.id, label: m.users.full_name }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }))
}

/** Cotisation minimale du club (€). Fallback 100 (jamais NaN/undefined). RLS lecture club. */
export async function getClubMinContribution(
  supabase: ServerClient,
  clubId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('clubs')
    .select('min_contribution')
    .eq('id', clubId)
    .maybeSingle<{ min_contribution: number }>()
  if (error || data == null) return 100
  const v = Number(data.min_contribution)
  return Number.isFinite(v) && v > 0 ? v : 100
}

/** Statut métier (operations.status + isCancelled) → statut présentationnel @evolve/ui. */
function toItemStatus(status: OperationStatus, isCancelled: boolean): OperationItemStatus {
  if (isCancelled || status === 'cancelled') return 'cancelled'
  // L'allocation de parts (settlement) marque l'opération côté DB ; en V0, une opération
  // confirmée avec des parts allouées est « settled ». Sinon « ok ».
  return 'ok'
}

/** Source DB (`manual` | `matrice_*`) → variante présentationnelle (manual | migrated). */
function toSourceVariant(source: OperationSource): 'manual' | 'migrated' {
  return source === 'manual' ? 'manual' : 'migrated'
}

/** Une opération est « settlée » si des parts ont été allouées (contributions réglées). */
function isSettled(op: Operation): boolean {
  return !op.isCancelled && op.partsAllocated != null && op.partsAllocated > 0
}

/**
 * Sous-ligne « meta » d'une opération (titres @ prix, sinon notes). Jamais undefined.
 */
function buildMeta(op: Operation): string | null {
  if (op.quantity != null && op.unitPrice != null) {
    return `${op.quantity} × ${op.unitPrice}`
  }
  return op.notes ?? op.assetName ?? null
}

/** Libellé principal d'une opération (symbole prioritaire, sinon type via l'UI). */
function buildLabel(op: Operation): string {
  return op.symbol ?? op.assetName ?? op.notes ?? '—'
}

/** Operation (DTO @evolve/data) → OperationListItemData (présentationnel @evolve/ui). */
export function toListItem(op: Operation): OperationListItemData {
  const status = isSettled(op) ? 'settled' : toItemStatus(op.status, op.isCancelled)
  return {
    id: op.id,
    type: op.type,
    label: buildLabel(op),
    meta: buildMeta(op),
    date: op.operationDate,
    amount: op.cashDelta,
    status,
    source: toSourceVariant(op.source),
  }
}

/** Operation (DTO @evolve/data) → OperationDetail (présentationnel @evolve/ui, drawer). */
export function toDetail(op: Operation): OperationDetail {
  const status = isSettled(op) ? 'settled' : toItemStatus(op.status, op.isCancelled)
  return {
    id: op.id,
    type: op.type,
    label: buildLabel(op),
    meta: buildMeta(op),
    date: op.operationDate,
    amount: op.cashDelta,
    ref: op.brokerReference,
    source: toSourceVariant(op.source),
    status,
    cancelReason: op.cancellationReason,
  }
}
