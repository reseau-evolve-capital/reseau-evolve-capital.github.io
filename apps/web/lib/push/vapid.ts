// VAPID — clé publique pour `pushManager.subscribe()` (PUSH-001 ; spec §6.1).
//
// La clé publique VAPID transite côté client (NEXT_PUBLIC_*), JAMAIS la clé privée
// (server-only, Edge `dispatch-push`). `pushManager.subscribe()` attend un BufferSource
// (Uint8Array) : on convertit la chaîne base64url en octets.

/** Clé publique VAPID (base64url) injectée à build via NEXT_PUBLIC_VAPID_PUBLIC_KEY. */
export function getVapidPublicKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  return key && key.trim().length > 0 ? key.trim() : undefined
}

/**
 * Convertit une clé VAPID base64url en `Uint8Array` (applicationServerKey).
 * Pur et testable. Throw si l'entrée n'est pas décodable — l'appelant (subscribe)
 * garde l'appel dans un try/catch (jamais d'exception remontée à React).
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
