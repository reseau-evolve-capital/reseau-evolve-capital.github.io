'use client'

import { useEffect } from 'react'

import { captureBeforeInstallPrompt } from '@/lib/pwa/beforeinstallprompt-store'
import { registerServiceWorker } from '@/lib/pwa/register-sw'

/**
 * Monté une fois dans le root layout (PWA-001). Au mount client :
 * 1. enregistre le service worker (prod/https only, gardé) ;
 * 2. capture l'event `beforeinstallprompt` au plus tôt (Chromium le tire très tôt).
 *
 * Ne rend rien. Aucun accès `window` au render (effets uniquement) → SSR-safe.
 */
export function PwaServiceWorkerRegistrar() {
  useEffect(() => {
    registerServiceWorker()
    const cleanup = captureBeforeInstallPrompt()
    return cleanup
  }, [])
  return null
}
