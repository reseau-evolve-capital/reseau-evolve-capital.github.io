// OPS-007 — Socle d'audit des actions sensibles : wrapper `withAudit` (append-only, fire-and-forget).
//
// Enrobe une Server Action existante. Après que l'action a RÉUSSI (résolu sans lever ET, si on le
// demande, avec un résultat « ok »), on journalise l'événement via le RPC SECURITY DEFINER
// `log_audit_event` (migration 053) en FIRE-AND-FORGET : l'appel RPC est awaité dans un try/catch
// qui AVALE toute erreur (→ Sentry via captureActionError) et ne la RE-PROPAGE JAMAIS.
//
// Garantie centrale (critère OPS-007) : un échec d'écriture du log NE FAIT JAMAIS échouer la
// mutation. Le résultat de l'action est renvoyé tel quel, que le log réussisse, échoue, ou que le
// RPC lève. Et si l'action elle-même lève, on NE logge PAS (pas de mutation → rien à auditer) et on
// laisse l'erreur remonter normalement.
//
// L'audit est posé APRÈS l'action (jamais avant) et HORS de sa transaction : aucun risque de
// rollback de la mutation à cause du log (contrairement à un trigger Postgres synchrone, interdit).
//
// Réf : migration 053 (audit_log + log_audit_event), lib/monitoring/sentry.ts (captureActionError),
// app/(app)/reseau/actions.ts (modèle Server Actions + serverClient), CLAUDE.md (RLS, jamais
// service-role côté app, TS strict zéro any).

import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { captureActionError } from '@/lib/monitoring/sentry'

/** Forme de résultat conventionnelle des Server Actions du repo (`{ ok: true | false }`). */
interface ActionResultLike {
  ok: boolean
}

/**
 * Un champ du descripteur d'audit : soit une valeur statique, soit une fonction qui la dérive du
 * résultat de l'action ET de ses arguments d'appel. Permet de capturer une cible/metadata calculée
 * (ex. l'id renvoyé par l'action) sans coupler le code appelant.
 */
type AuditField<T, Args extends unknown[]> = T | ((result: Awaited<unknown>, ...args: Args) => T)

/** Descripteur d'audit attaché à une action enveloppée par {@link withAudit}. */
export interface AuditDescriptor<R, Args extends unknown[]> {
  /** Nom de l'action journalisée (verbe métier stable, ex. 'deleteClub'). */
  action: string
  /** Type de la cible (ex. 'club', 'membership', 'poll'). Statique ou dérivé. */
  targetType?: AuditField<string | null, Args>
  /** Identifiant de la cible (uuid, slug, période…). Statique ou dérivé (ex. depuis `result`). */
  targetId?: AuditField<string | null, Args>
  /** Métadonnées libres (jamais de PII). Statiques ou dérivées du résultat / des arguments. */
  metadata?: AuditField<Record<string, unknown>, Args>
  /**
   * Décide si l'événement doit être journalisé pour ce résultat. Par défaut : on logge dès que
   * l'action a résolu (n'a pas levé). Pour les actions au résultat `{ ok }`, passer
   * `shouldLog: (r) => r.ok` afin de NE journaliser que les succès métier.
   */
  shouldLog?: (result: R, ...args: Args) => boolean
}

/** Résout un champ statique-ou-dérivé du descripteur. */
function resolveField<T, Args extends unknown[]>(
  field: AuditField<T, Args> | undefined,
  fallback: T,
  result: unknown,
  args: Args
): T {
  if (field === undefined) return fallback
  if (typeof field === 'function') {
    // reason: AuditField encode l'union (T | fonction) ; le narrowing par typeof ne raffine pas le
    // generic T, mais l'appel est sûr — c'est bien la branche fonction de l'union.
    return (field as (result: unknown, ...a: Args) => T)(result, ...args)
  }
  return field
}

/**
 * Journalise un événement d'audit en fire-and-forget. N'attend pas en dehors du try/catch : toute
 * erreur (création du client, RPC en échec, RPC qui lève) est avalée et routée vers Sentry. Ne
 * lève JAMAIS — c'est ce qui garantit qu'un log raté n'impacte pas la mutation.
 */
async function logAudit(
  action: string,
  targetType: string | null,
  targetId: string | null,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createServerClient(await cookies())
    const { error } = await supabase.rpc('log_audit_event', {
      p_action: action,
      p_target_type: targetType ?? undefined,
      p_target_id: targetId ?? undefined,
      p_metadata: metadata as never,
    })
    if (error) {
      // Échec « doux » du RPC (RLS, indispo…) : capté, jamais propagé.
      captureActionError(error, {
        action: 'withAudit:log',
        extra: { auditedAction: action, code: error.code, message: error.message },
      })
    }
  } catch (err) {
    // Échec « dur » (cookies/SSR, client, RPC qui lève) : capté, jamais propagé.
    captureActionError(err, { action: 'withAudit:log', extra: { auditedAction: action } })
  }
}

/**
 * Enrobe une Server Action `fn` d'une journalisation d'audit fire-and-forget posée APRÈS son succès.
 *
 * Renvoie une fonction de MÊME signature que `fn` : on enveloppe une action existante sans changer
 * son contrat d'appel ni son type de retour. Le log est awaité (pour être déterministe et testable)
 * mais isolé dans un try/catch interne — il ne peut ni faire échouer ni retarder une erreur de `fn`.
 *
 * @example
 * export const deleteClubAction = withAudit(
 *   _deleteClubAction,
 *   {
 *     action: 'deleteClub',
 *     targetType: 'club',
 *     targetId: (_r, clubId: string) => clubId,
 *     shouldLog: (r) => r.ok, // ne journalise que la suppression réellement effectuée
 *   }
 * )
 */
export function withAudit<R, Args extends unknown[]>(
  fn: (...args: Args) => Promise<R>,
  descriptor: AuditDescriptor<R, Args>
): (...args: Args) => Promise<R> {
  return async (...args: Args): Promise<R> => {
    // 1. Exécute l'action. Si elle LÈVE, on ne logge pas (pas de mutation) et l'erreur remonte.
    const result = await fn(...args)

    // 2. Décide si l'on journalise. Par défaut : toute résolution. Sinon, prédicat fourni.
    const shouldLog = descriptor.shouldLog ? descriptor.shouldLog(result, ...args) : true
    if (shouldLog) {
      const targetType = resolveField(descriptor.targetType, null, result, args)
      const targetId = resolveField(descriptor.targetId, null, result, args)
      const metadata = resolveField(descriptor.metadata, {}, result, args)
      // 3. Fire-and-forget : awaité mais jamais propagé (logAudit n'lève pas).
      await logAudit(descriptor.action, targetType, targetId, metadata)
    }

    // 4. Renvoie le résultat de l'action, INTACT, quoi qu'il arrive au log.
    return result
  }
}

export type { ActionResultLike }
