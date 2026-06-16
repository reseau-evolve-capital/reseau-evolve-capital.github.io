// Abonnement Web Push côté client (PUSH-001 ; spec §6.3).
//
// Orchestration du flux subscribe :
//   1. registration SW déjà active (PwaServiceWorkerRegistrar — prod uniquement)
//   2. Notification.requestPermission()
//   3. registration.pushManager.subscribe({ userVisibleOnly, applicationServerKey })
//   4. POST /api/push/subscribe (la route persiste en service de session, RLS)
//
// IMPORTANT (dev) : le SW n'est enregistré qu'en production + contexte sécurisé
// (cf. lib/pwa/register-sw.ts). En localhost dev, `getSwRegistration()` renvoie null →
// `subscribePush()` retourne 'unsupported' sans throw. Le vrai push se teste sur un
// déploiement HTTPS (preview Vercel) avec NEXT_PUBLIC_VAPID_PUBLIC_KEY défini.
//
// Tout est crash-safe : aucune exception ne remonte à React.

import type { PwaCase } from '@evolve/types'

import { detectPwaCase } from '@/lib/pwa/platform-detection'
import { getVapidPublicKey, urlBase64ToUint8Array } from './vapid'

/** Plateforme persistée (snapshot debug, pas de PII) — aligné sur le CHECK de la migration 039. */
export type PushPlatformTag =
  | 'desktop'
  | 'android-chrome'
  | 'ios-safari'
  | 'ios-other'
  | 'standalone'
  | 'unknown'

/** Résultat d'un appel `subscribePush()`. */
export type SubscribeResult = 'subscribed' | 'denied' | 'unsupported' | 'no-vapid-key' | 'error'

/** État courant de la subscription sur cet appareil (pour piloter le toggle profil). */
export type SubscriptionState = {
  supported: boolean
  permission: NotificationPermission
  subscribed: boolean
}

/** Mappe un PwaCase vers le tag plateforme persisté (jamais d'autre valeur que le CHECK DB). */
export function platformTagFor(pwaCase: PwaCase): PushPlatformTag {
  switch (pwaCase) {
    case 'desktop':
    case 'android-chrome':
    case 'ios-safari':
    case 'ios-other':
    case 'standalone':
      return pwaCase
    default:
      return 'unknown'
  }
}

/** Registration SW active (null en dev, où le SW n'est pas enregistré, ou si API absente). */
async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
    const reg = await navigator.serviceWorker.ready
    return reg ?? null
  } catch {
    return null
  }
}

/** Lit l'état de subscription courant — crash-safe, jamais de throw. */
export async function getSubscriptionState(): Promise<SubscriptionState> {
  const supported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'PushManager' in window &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator
  if (!supported) return { supported: false, permission: 'default', subscribed: false }

  let permission: NotificationPermission = 'default'
  try {
    permission = Notification.permission
  } catch {
    permission = 'default'
  }

  try {
    const reg = await getSwRegistration()
    const sub = reg ? await reg.pushManager.getSubscription() : null
    return { supported: true, permission, subscribed: sub !== null }
  } catch {
    return { supported: true, permission, subscribed: false }
  }
}

/**
 * Demande la permission, s'abonne au PushManager et persiste la subscription via l'API.
 * Crash-safe : retourne un code de résultat, ne throw jamais.
 */
export async function subscribePush(): Promise<SubscribeResult> {
  try {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('PushManager' in window)
    ) {
      return 'unsupported'
    }

    const vapidKey = getVapidPublicKey()
    if (!vapidKey) return 'no-vapid-key'

    const reg = await getSwRegistration()
    if (!reg) return 'unsupported' // pas de SW (dev, ou navigateur sans support)

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'

    // Réutilise une subscription existante si présente, sinon en crée une nouvelle.
    let subscription = await reg.pushManager.getSubscription()
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // `as BufferSource` : la lib DOM type applicationServerKey sur ArrayBuffer (non
        // SharedArrayBuffer) ; Uint8Array<ArrayBufferLike> n'est pas assignable directement.
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })
    }

    const json = subscription.toJSON()
    const endpoint = json.endpoint
    const p256dh = json.keys?.p256dh
    const auth = json.keys?.auth
    if (!endpoint || !p256dh || !auth) return 'error'

    const platform = platformTagFor(detectPwaCase())
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint,
        keys: { p256dh, auth },
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        platform,
      }),
    })
    if (!res.ok) return 'error'

    return 'subscribed'
  } catch {
    return 'error'
  }
}

/**
 * Désabonne l'appareil courant : retire la subscription du PushManager ET côté serveur
 * (DELETE par endpoint pour l'utilisateur courant). Crash-safe.
 *
 * @returns true si au moins l'une des deux opérations a réussi (best-effort).
 */
export async function unsubscribePush(): Promise<boolean> {
  let ok = false
  try {
    const reg = await getSwRegistration()
    const subscription = reg ? await reg.pushManager.getSubscription() : null
    const endpoint = subscription?.endpoint

    if (subscription) {
      try {
        await subscription.unsubscribe()
        ok = true
      } catch {
        /* on tente quand même la suppression serveur */
      }
    }

    if (endpoint) {
      try {
        const res = await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        })
        if (res.ok) ok = true
      } catch {
        /* noop */
      }
    }
  } catch {
    /* noop */
  }
  return ok
}
