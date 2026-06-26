'use server'

// Server Action de la console feedbacks BUREAU DE CLUB (ADM-009, /admin/retours) :
// changement de statut d'un retour de SON club.
//
// Double scoping en défense (jamais de service-role) :
//   1. RLS « feedback: club staff update status » (migration 054) : seul le staff d'un club peut
//      UPDATE le statut des feedbacks de CE club ; tout le reste passe le USING à false.
//   2. Filtre applicatif `.eq('club_id', ctx.clubId)` : restreint au club ACTIF (un staff multi-club
//      ne peut pas, depuis la console d'un club, modifier un retour d'un AUTRE de ses clubs). Le
//      contexte admin est dérivé du club actif (cf. lib/data/request.ts) — comme les autres écrans /admin.
//
// On revalide la liste blanche de `status` côté serveur (message stable, pas d'aller-retour DB).
// L'action est enveloppée par `withAudit` (OPS-007) : journalisation fire-and-forget après succès,
// qui NE PEUT PAS faire échouer la mutation.
//
// Réf : app/(app)/reseau/retours/actions.ts (jumelle réseau), migration 054 (RLS staff-club),
//   lib/data/request.ts (getAdminContext), lib/actions/withAudit.ts, CLAUDE.md (RLS, jamais service-role).

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@evolve/data'
import { captureActionError } from '@/lib/monitoring/sentry'
import { withAudit } from '@/lib/actions/withAudit'
import { getSessionUser, getAdminContext } from '@/lib/data/request'
import { FEEDBACK_STATUSES, type FeedbackStatus } from '@/lib/data/feedback'

export type UpdateFeedbackStatusResult = { ok: true } | { ok: false; error: string }

function isStatus(v: unknown): v is FeedbackStatus {
  return typeof v === 'string' && (FEEDBACK_STATUSES as readonly string[]).includes(v)
}

/**
 * Met à jour le statut d'un feedback de SON club. Réservé au staff du club actif par la RLS
 * (migration 054) ET par le filtre `club_id = club actif` (un non-staff ou un feedback hors club
 * → 0 ligne affectée → erreur métier stable « forbidden », pas de fuite).
 */
async function _updateClubFeedbackStatusAction(
  feedbackId: string,
  status: FeedbackStatus
): Promise<UpdateFeedbackStatusResult> {
  if (!feedbackId || typeof feedbackId !== 'string') return { ok: false, error: 'invalid_id' }
  if (!isStatus(status)) return { ok: false, error: 'invalid_status' }

  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'unauthorized' }

  // Contexte admin scopé au club ACTIF : null si l'utilisateur ne peut pas voir l'admin de ce club.
  // canManage=false (secrétaire, LECTURE SEULE) → refus immédiat (la RLS migration 054 le bloque
  // aussi, mais on coupe court côté app pour un message stable et zéro requête inutile).
  const ctx = await getAdminContext(user.id)
  if (!ctx || !ctx.canManage) return { ok: false, error: 'forbidden' }

  const supabase = createServerClient(await cookies())

  const { data, error } = await supabase
    .from('feedback')
    .update({ status })
    .eq('id', feedbackId)
    .eq('club_id', ctx.clubId)
    .select('id')

  if (error) {
    captureActionError(error, {
      action: 'updateClubFeedbackStatus',
      userId: user.id,
      extra: { feedbackId, status, clubId: ctx.clubId, code: error.code },
    })
    return { ok: false, error: 'update_failed' }
  }

  // RLS + filtre club : un non-staff ou un feedback hors club → 0 ligne (pas d'erreur SQL).
  if (!data || data.length === 0) return { ok: false, error: 'forbidden' }

  revalidatePath('/admin/retours')
  return { ok: true }
}

/**
 * Version journalisée (OPS-007) : audite seulement les succès métier (`ok`). La cible est le
 * feedback ; le statut visé est capturé en métadonnée (jamais de PII).
 */
export const updateClubFeedbackStatusAction = withAudit(_updateClubFeedbackStatusAction, {
  action: 'updateClubFeedbackStatus',
  targetType: 'feedback',
  targetId: (_r, feedbackId: string) => feedbackId,
  metadata: (_r, _feedbackId: string, status: FeedbackStatus) => ({ status }),
  shouldLog: (r) => r.ok,
})
