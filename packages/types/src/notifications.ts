// Contrat partagé Web Push (PUSH-001 ; spec docs/superpowers/specs/2026-06-16-web-push-notifications-design.md §3.1).
//
// Type d'événement de notification consommé par TOUTE la chaîne : le module métier
// (vote action) construit un NotificationEvent, `dispatchNotification` (@evolve/data)
// l'invoque vers l'Edge `dispatch-push`, qui le mappe en payload push via les templates
// (@evolve/data/notifications). Extensible sans breaking change : il suffit d'ajouter
// un type à l'union.
//
// ANONYMAT : le payload ne porte JAMAIS de PII (pas de user_id, email, ni compteur de
// votants). Seuls `pollId` / `clubId` / `title` / `closesAt` transitent.

/** Types d'événements push V0. Extensible sans breaking change. */
export type NotificationEventType = 'poll.opened' | 'poll.closed' | 'poll.reminder' | 'system.test' // bouton « Tester » profil

export type NotificationEvent = {
  type: NotificationEventType
  clubId: string
  payload: {
    pollId?: string
    title: string
    /** ISO — optionnel (rappel / deadline). `null` = pas de clôture automatique. */
    closesAt?: string | null
  }
}
