'use server'

// Server Actions du module Opérations trésorier (E-OPS-2).
//
// Deux mutations, toutes deux passant par les RPC SECURITY DEFINER `record_operation` /
// `cancel_operation` (migrations 057+). La RPC vérifie elle-même l'autorité staff DU CLUB et
// journalise l'audit DB (log_audit_event). On AJOUTE en plus la trace app-layer via withAudit
// (convention repo, noms d'action distincts) — fire-and-forget, jamais bloquante.
//
// Garde côté serveur : getAdminContext (trésorier+ DU club actif) — défense en profondeur.
// JAMAIS de service-role ici : tout passe par la RLS de la session (createServerClient).
//
// Réf : actions.ts (modèle _fn + withAudit + mapPgError), withAudit.ts, lib/data/request.ts.

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@evolve/data'
import { getSessionUser, getAdminContext } from '@/lib/data/request'
import { captureActionError } from '@/lib/monitoring/sentry'
import { withAudit } from '@/lib/actions/withAudit'

/** Résultat conventionnel des Server Actions du repo. */
export type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

/** Entrée de saisie d'une opération (émise par OperationForm → OperationFormPayload). */
export interface RecordOperationInput {
  type: string
  cashDelta: number
  operationDate: string | null
  membershipId: string | null
  symbol: string | null
  assetName: string | null
  quantity: number | null
  unitPrice: number | null
  currency: string | null
  fxRate: number | null
  brokerRef: string | null
  notes: string | null
}

async function serverClient() {
  return createServerClient(await cookies())
}

/** Codes Postgres → erreurs métier stables (consommées par l'UI pour un message i18n). */
function mapPgError(code: string | undefined): string {
  if (code === '42501') return 'forbidden' // insufficient_privilege : staff requis
  if (code === '22023') return 'invalid' // invalid_parameter_value : paramètre rejeté
  if (code === '23514') return 'invalid' // check_violation : type/montant hors contrainte
  if (code === '23503') return 'invalid' // foreign_key_violation : membre/club inexistant
  return 'unknown'
}

/** Capture une erreur Supabase inattendue (code PG non mappé → 'unknown'). */
function captureIfUnknown(
  error: { code?: string; message?: string } | null | undefined,
  action: string,
  userId?: string
): void {
  if (!error) return
  if (mapPgError(error.code) !== 'unknown') return
  captureActionError(error, { action, userId, extra: { code: error.code, message: error.message } })
}

/**
 * Enregistre une opération via la RPC `record_operation`. La date est obligatoire (la RPC la
 * requiert) ; un type/montant invalide remonte en erreur métier stable. Le club est résolu côté
 * serveur (club actif du trésorier), jamais passé par le client.
 */
async function _recordOperationAction(input: RecordOperationInput): Promise<ActionResult> {
  if (!input.operationDate) return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'unauthorized' }
  const ctx = await getAdminContext(user.id)
  if (!ctx) return { ok: false, error: 'forbidden' }

  const { data, error } = await supabase.rpc('record_operation', {
    p_club_id: ctx.clubId,
    p_type: input.type,
    p_cash_delta: input.cashDelta,
    p_operation_date: input.operationDate,
    p_membership_id: input.membershipId ?? undefined,
    p_symbol: input.symbol ?? undefined,
    p_asset_name: input.assetName ?? undefined,
    p_quantity: input.quantity ?? undefined,
    p_unit_price: input.unitPrice ?? undefined,
    p_currency: input.currency ?? undefined,
    p_fx_rate: input.fxRate ?? undefined,
    p_notes: input.notes ?? undefined,
    p_broker_ref: input.brokerRef ?? undefined,
  })
  if (error) {
    captureIfUnknown(error, 'recordOperation', user.id)
    return { ok: false, error: mapPgError(error.code) }
  }

  revalidatePath('/admin/operations')
  revalidatePath('/admin/operations/toutes')
  return { ok: true, id: typeof data === 'string' ? data : undefined }
}

/**
 * Enregistre une opération, journalisé app-layer (audit fire-and-forget sur succès). Aucune PII
 * n'est tracée (ni notes ni référence) : seuls le type et l'id de l'opération créée le sont.
 */
export const recordOperationAction: (input: RecordOperationInput) => Promise<ActionResult> =
  withAudit(_recordOperationAction, {
    action: 'operation.record',
    targetType: 'operation',
    targetId: (result) => {
      const r = result as ActionResult
      return r.ok ? (r.id ?? null) : null
    },
    metadata: (_result, input: RecordOperationInput) => ({ type: input.type }),
    shouldLog: (result) => result.ok,
  })

/**
 * Annule logiquement une opération via la RPC `cancel_operation` (l'opération reste en base,
 * marquée annulée + motif). Le motif est obligatoire côté UI ET ici (RPC le requiert).
 */
async function _cancelOperationAction(operationId: string, reason: string): Promise<ActionResult> {
  const trimmed = reason.trim()
  if (!trimmed) return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'unauthorized' }
  const ctx = await getAdminContext(user.id)
  if (!ctx) return { ok: false, error: 'forbidden' }

  const { error } = await supabase.rpc('cancel_operation', {
    p_operation_id: operationId,
    p_reason: trimmed,
  })
  if (error) {
    captureIfUnknown(error, 'cancelOperation', user.id)
    return { ok: false, error: mapPgError(error.code) }
  }

  revalidatePath('/admin/operations')
  revalidatePath('/admin/operations/toutes')
  return { ok: true }
}

/** Annule une opération, journalisé app-layer (le motif, texte libre, n'est PAS tracé). */
export const cancelOperationAction: (operationId: string, reason: string) => Promise<ActionResult> =
  withAudit(_cancelOperationAction, {
    action: 'operation.cancel',
    targetType: 'operation',
    targetId: (_result, operationId: string) => operationId,
    shouldLog: (result) => result.ok,
  })
