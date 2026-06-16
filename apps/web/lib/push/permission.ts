// Support & capacité Web Push (PUSH-001 ; spec §6.4).
//
// Compose la détection plateforme (detectPwaCase, PWA-001) + l'état de l'API Notification
// pour répondre à : « cet appareil peut-il s'abonner aux push maintenant ? ». Tout est
// SSR-safe et crash-safe : sans `window`/API → `unsupported`, jamais d'exception.

import { detectPwaCase } from '@/lib/pwa/platform-detection'
import { capabilityForPwaCase, type PushPlatformCapability } from './platform-push'

/** Vrai si le navigateur expose les API Web Push (Notification + PushManager + SW). */
export function isPushSupported(): boolean {
  try {
    if (typeof window === 'undefined') return false
    return (
      'Notification' in window &&
      'PushManager' in window &&
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator
    )
  } catch {
    return false
  }
}

/** Lit `Notification.permission` de façon gardée (SSR / API absente → 'default'). */
export function readNotificationPermission(): NotificationPermission {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'default'
    return Notification.permission
  } catch {
    return 'default'
  }
}

/**
 * Capacité push de l'appareil courant — règles ordonnées (spec §6.4) :
 *   1. !isPushSupported()                        → 'unsupported'
 *   2. detectPwaCase() === 'ios-safari'          → 'needs_pwa_install' (fallback iOS)
 *   3. detectPwaCase() === 'ios-other'           → 'needs_safari'
 *   4. Notification.permission === 'denied'      → 'blocked'
 *   5. sinon                                      → 'ready'
 *
 * Crash-safe (jamais de throw vers React). `pwaCase` / `permission` sont injectables
 * pour la testabilité ; sinon lus du runtime.
 */
export function canSubscribeOnPlatform(
  pwaCase = detectPwaCase(),
  permission = readNotificationPermission()
): PushPlatformCapability {
  if (!isPushSupported()) return 'unsupported'

  const platform = capabilityForPwaCase(pwaCase)
  // La dimension plateforme prime sur la permission : un iPhone hors écran d'accueil ne
  // peut pas recevoir de push, même si la permission n'a pas encore été refusée.
  if (
    platform === 'unsupported' ||
    platform === 'needs_pwa_install' ||
    platform === 'needs_safari'
  ) {
    return platform
  }

  if (permission === 'denied') return 'blocked'
  return 'ready'
}
