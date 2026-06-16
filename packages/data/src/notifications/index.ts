// Barrel module notifications Web Push (@evolve/data/notifications) — PUSH-001.
//
// Expose l'API d'envoi server-only (dispatchNotification), les templates de copy purs
// (buildNotificationContent) et les types (NotificationEvent / DispatchResult / …).

export { dispatchNotification } from './dispatch.ts'
export { buildNotificationContent } from './templates.ts'
export type {
  NotificationEvent,
  NotificationEventType,
  NotificationContent,
  DispatchResult,
} from './types.ts'
