'use client'

import { useEffect } from 'react'

import { analyticsEvents, clearAnalyticsUser, setAnalyticsUser } from '@/lib/analytics'
import { useConsent } from '@/lib/consent/use-consent'

interface Props {
  /** user_id pseudonyme (UUID Supabase haché côté serveur). Null si non authentifié. */
  userIdHash: string | null
  /** User properties pseudonymes (jamais de PII) : user_type, club_count, onboarding_complete, locale. */
  userProps: Record<string, unknown>
}

/**
 * Identité analytics GA4 (Phase 2). Côté authentifié uniquement.
 * - Pose `user_id` + user_properties **uniquement si le consentement « Mesure d'audience »
 *   est accordé** (sinon les retire). Réagit au changement de consentement.
 * - Émet `login_completed` une fois par session navigateur (garde sessionStorage).
 * Aucune PII : le user_id est un hash, les propriétés sont catégorielles / bucketisées.
 */
export function AnalyticsIdentify({ userIdHash, userProps }: Props) {
  const { analytics } = useConsent()

  useEffect(() => {
    if (!userIdHash) return
    if (analytics === true) {
      const theme =
        typeof document !== 'undefined' && document.documentElement.dataset['theme'] === 'dark'
          ? 'dark'
          : 'light'
      setAnalyticsUser(userIdHash, { ...userProps, theme })
    } else {
      clearAnalyticsUser()
    }
  }, [userIdHash, analytics, userProps])

  // login_completed : une fois par session navigateur (≈ une fois par connexion).
  useEffect(() => {
    if (!userIdHash) return
    try {
      const KEY = 'ec.login_fired'
      if (sessionStorage.getItem(KEY)) return
      sessionStorage.setItem(KEY, '1')
      analyticsEvents.auth.loginCompleted()
    } catch {
      /* sessionStorage indispo → on ignore */
    }
  }, [userIdHash])

  return null
}
