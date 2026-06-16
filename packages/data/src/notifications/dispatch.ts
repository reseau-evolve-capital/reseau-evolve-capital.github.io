// dispatchNotification — API d'envoi Web Push (PUSH-001 ; spec §3.2). SERVER-ONLY.
//
// Appelé depuis les Server Actions (vote publish/close), les RPC triggers ou les jobs cron,
// TOUJOURS avec un client SERVICE ROLE (createServiceRoleClient). JAMAIS depuis le browser :
// l'Edge `dispatch-push` résout les destinataires et envoie via VAPID en service_role.
//
// FIRE-AND-FORGET : un échec push ne doit jamais faire échouer l'action métier (la
// publication d'un vote est déjà persistée ; l'in-app couvre le gap). Cette fonction ne
// throw donc JAMAIS — elle retourne {sent:0,failed:0,skipped:0} en cas d'erreur.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/types.gen.ts'
import type { DispatchResult, NotificationEvent } from './types.ts'

const EMPTY_RESULT: DispatchResult = { sent: 0, failed: 0, skipped: 0 }

/** Coerce le retour brut de l'Edge en DispatchResult défensif (compteurs entiers >= 0). */
function toResult(data: unknown): DispatchResult {
  if (data == null || typeof data !== 'object') return { ...EMPTY_RESULT }
  const r = data as Record<string, unknown>
  const num = (v: unknown): number => {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0
  }
  return { sent: num(r.sent), failed: num(r.failed), skipped: num(r.skipped) }
}

/**
 * Dispatche un événement de notification vers l'Edge `dispatch-push`.
 *
 * @param supabaseAdmin client SERVICE ROLE (server-only) — l'Edge n'est pas exposée au client.
 * @param event NotificationEvent (type + clubId + payload anonyme).
 * @returns compteurs agrégés {sent, failed, skipped} — jamais de throw (fire-and-forget).
 */
export async function dispatchNotification(
  supabaseAdmin: SupabaseClient<Database>,
  event: NotificationEvent
): Promise<DispatchResult> {
  try {
    const { data, error } = await supabaseAdmin.functions.invoke('dispatch-push', {
      body: event,
    })
    if (error) return { ...EMPTY_RESULT }
    return toResult(data)
  } catch {
    // Réseau down, Edge absente en local, etc. → no-op silencieux (l'in-app couvre le gap).
    return { ...EMPTY_RESULT }
  }
}
