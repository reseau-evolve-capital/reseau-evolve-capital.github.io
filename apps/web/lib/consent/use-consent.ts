'use client'

import { useCallback, useSyncExternalStore } from 'react'

import { applyAnalyticsConsent } from './consent-mode'
import { getServerSnapshot, getSnapshot, setConsent, subscribe } from './consent-storage'

export interface UseConsentReturn {
  /** Choix courant (null = non résolu → bannière affichée). */
  analytics: boolean | null
  /** Le visiteur a-t-il déjà tranché ? */
  resolved: boolean
  acceptAll: () => void
  rejectAll: () => void
  /** Enregistre un choix granulaire (toggle Mesure d'audience). */
  save: (analytics: boolean) => void
}

/**
 * État de consentement réactif (useSyncExternalStore sur le store localStorage).
 * Chaque action persiste le choix ET pousse le signal Consent Mode v2 à GA.
 */
export function useConsent(): UseConsentReturn {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const acceptAll = useCallback(() => {
    setConsent(true)
    applyAnalyticsConsent(true)
  }, [])
  const rejectAll = useCallback(() => {
    setConsent(false)
    applyAnalyticsConsent(false)
  }, [])
  const save = useCallback((analytics: boolean) => {
    setConsent(analytics)
    applyAnalyticsConsent(analytics)
  }, [])

  return {
    analytics: state?.analytics ?? null,
    resolved: state !== null,
    acceptAll,
    rejectAll,
    save,
  }
}

/** Le consentement est-il résolu ? (utilisé pour empêcher le chevauchement avec la bannière PWA). */
export function useConsentResolved(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) !== null
}
