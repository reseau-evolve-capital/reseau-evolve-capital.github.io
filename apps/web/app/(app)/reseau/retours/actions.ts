'use server'

// Server Action de la console feedbacks RÉSEAU (NET-019) : changement de statut d'un retour.
//
// L'UPDATE passe sous la RLS de la session : la policy « feedback: network update status »
// (migration 051) n'autorise l'UPDATE qu'à un membre réseau (is_network_member()). JAMAIS de
// service-role ici. Le CHECK de migration 036 valide les valeurs de status côté DB ; on revalide
// aussi côté serveur (liste blanche) pour un message d'erreur stable et éviter un aller-retour DB.
//
// Réf : apps/web/lib/feedback/actions.ts (modèle de résultat discriminé), migration 051 (RLS),
//   apps/web/app/(app)/reseau/actions.ts (pattern Server Action réseau), CLAUDE.md (RLS).

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@evolve/data'
import { captureActionError } from '@/lib/monitoring/sentry'
import { FEEDBACK_STATUSES, type FeedbackStatus } from '@/lib/data/feedback'

export type UpdateFeedbackStatusResult = { ok: true } | { ok: false; error: string }

function isStatus(v: unknown): v is FeedbackStatus {
  return typeof v === 'string' && (FEEDBACK_STATUSES as readonly string[]).includes(v)
}

/**
 * Met à jour le statut d'un feedback (received→in_progress→done→closed). Réservé aux membres
 * réseau par la RLS (un non-membre verra 0 ligne affectée → erreur métier stable « forbidden »).
 */
export async function updateFeedbackStatusAction(
  feedbackId: string,
  status: FeedbackStatus
): Promise<UpdateFeedbackStatusResult> {
  if (!feedbackId || typeof feedbackId !== 'string') return { ok: false, error: 'invalid_id' }
  if (!isStatus(status)) return { ok: false, error: 'invalid_status' }

  const supabase = createServerClient(await cookies())

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }

  const { data, error } = await supabase
    .from('feedback')
    .update({ status })
    .eq('id', feedbackId)
    .select('id')

  if (error) {
    captureActionError(error, {
      action: 'updateFeedbackStatus',
      userId: user.id,
      extra: { feedbackId, status, code: error.code },
    })
    return { ok: false, error: 'update_failed' }
  }

  // RLS : un non-membre réseau passe le USING à false → 0 ligne renvoyée (pas d'erreur SQL).
  if (!data || data.length === 0) return { ok: false, error: 'forbidden' }

  revalidatePath('/reseau/retours')
  return { ok: true }
}
