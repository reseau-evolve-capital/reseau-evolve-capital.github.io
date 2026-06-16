// Types du module notifications (@evolve/data) — Web Push V0 (PUSH-001).
//
// Le contrat d'événement vit dans @evolve/types (NotificationEvent) ; on le re-exporte ici
// pour que les consommateurs de @evolve/data n'aient qu'un point d'import. On ajoute le
// type de retour d'envoi (DispatchResult) — compteurs agrégés, jamais de PII.

import type { NotificationEvent, NotificationEventType } from '@evolve/types'

export type { NotificationEvent, NotificationEventType }

/**
 * Résultat agrégé d'un envoi push (retour de l'Edge `dispatch-push`).
 * Compteurs uniquement — aucune identité de destinataire (anonymat).
 */
export interface DispatchResult {
  sent: number
  failed: number
  skipped: number
}

/** Contenu d'une notification système, prêt pour `showNotification()` côté SW. */
export interface NotificationContent {
  title: string
  body: string
  /** Deep link in-app (ex. `/votes/{pollId}`). */
  url: string
  /** Tag stable par poll → une nouvelle push remplace la précédente (anti-spam tray). */
  tag: string
}
