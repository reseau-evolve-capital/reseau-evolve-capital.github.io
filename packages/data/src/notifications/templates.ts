// Templates de copy Web Push (PUSH-001 ; spec §2.1, §6.5, §7.4). FR uniquement en V0
// (EN = follow-up i18n push V1). PURES (aucun I/O), trivialement testables.
//
// ANONYMAT — règle produit NON NÉGOCIABLE (§2.2) :
//   Le contenu ne porte JAMAIS de PII : pas de user_id, email, nom d'un votant, ni
//   « X membres ont voté », ni pourcentage, ni contenu de réponse. Le payload push se
//   limite à title / body / url / tag.

import { formatDate } from '@evolve/utils'
import type { NotificationContent, NotificationEvent } from './types.ts'

const FALLBACK_TITLE = 'Evolve Capital'

/** Deep link vote : `/votes/{pollId}` ; fallback `/dashboard` si pas de pollId (§6.5). */
function pollUrl(pollId: string | undefined): string {
  return pollId ? `/votes/${pollId}` : '/dashboard'
}

/** Tag stable par poll → une nouvelle push remplace la précédente sur le même vote. */
function pollTag(prefix: string, pollId: string | undefined): string {
  return pollId ? `${prefix}-${pollId}` : prefix
}

/** Libellé d'échéance FR (« le 30/06/2026 ») ou chaîne vide si pas de date. */
function deadlineClause(closesAt: string | null | undefined): string {
  if (!closesAt) return ''
  const formatted = formatDate(closesAt)
  // formatDate renvoie « — » sur date invalide → on omet la clause plutôt que d'afficher un tiret.
  if (formatted === '—') return ''
  return ` — répondez avant le ${formatted}`
}

/**
 * Mappe un `NotificationEvent` vers le contenu d'une notification système (FR, anonyme).
 * Pur : pas d'I/O. Le titre du payload (`event.payload.title`) est le titre du vote, jamais
 * une identité. Aucune PII produite.
 */
export function buildNotificationContent(event: NotificationEvent): NotificationContent {
  const { type, payload } = event
  const title = payload.title?.trim() || FALLBACK_TITLE

  switch (type) {
    case 'poll.opened':
      return {
        title: 'Nouveau vote',
        body: `Nouveau vote : ${title}${deadlineClause(payload.closesAt)}`,
        url: pollUrl(payload.pollId),
        tag: pollTag('poll-opened', payload.pollId),
      }

    case 'poll.closed':
      return {
        title: 'Résultats du vote',
        body: `Résultats disponibles : ${title}`,
        url: pollUrl(payload.pollId),
        tag: pollTag('poll-closed', payload.pollId),
      }

    case 'poll.reminder':
      return {
        title: 'Dernière chance de voter',
        body: `Il vous reste 24 h pour voter : ${title}`,
        url: pollUrl(payload.pollId),
        tag: pollTag('poll-reminder', payload.pollId),
      }

    case 'system.test':
      return {
        title: FALLBACK_TITLE,
        body: 'Notification de test : tout fonctionne. Vous recevrez les notifications de vote ici.',
        url: '/dashboard',
        tag: 'system-test',
      }
  }
}
