'use client'

// PushOptInMount (PUSH-001 ; spec §6.3) — point de montage du pre-prompt Web Push.
//
// Monté dans le layout (app) à côté de <InstallBannerMount/> (persiste entre onglets) mais
// ne s'affiche que sur /dashboard. Toute la logique est enrobée d'un ErrorBoundary : une
// erreur ici ne peut JAMAIS crasher le dashboard. Suspense est requis (cohérence avec le
// mount PWA + appels client) — fallback null.
//
// Gating (spec §2.3 / §6.4) :
//   - pathname === '/dashboard'
//   - capability === 'ready' (via usePushOptIn → canSubscribeOnPlatform)
//   - Notification.permission === 'default' (jamais re-prompter si déjà accordé/refusé)
//   - cooldown 7 j expiré (pushDismissStore)
//   - consentement RGPD résolu (anti-chevauchement avec la bannière de consentement)
//
// Analytics : optInPromptShown au premier affichage, optInAccepted / optInDismissed selon
// l'issue. Aucune PII (capability + reason uniquement).

import { usePathname } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { useToast } from '@evolve/ui'

import { analyticsEvents } from '@/lib/analytics'
import { useConsentResolved } from '@/lib/consent/use-consent'
import { peekSkipPushPromptOnce, clearSkipPushPromptOnce } from '@/lib/push/skip-prompt'
import { usePushOptIn } from '@/lib/push/use-push-opt-in'
import { PushOptInErrorBoundary } from './PushOptInErrorBoundary'
import { PushOptInSheet } from './PushOptInSheet'

function PushOptInInner() {
  const pathname = usePathname()
  const t = useTranslations('push')
  const toast = useToast()
  const consentResolved = useConsentResolved()

  const { capability, shouldShowPrePrompt, requestOptIn, dismiss } = usePushOptIn()

  // Masquage local après une action terminée. Initialisé à `true` si un reload technique de
  // bascule de club vient d'avoir lieu (drapeau one-shot posé par le ClubSwitcher) → on ne
  // rouvre pas le pre-prompt à cause de ce reload (le cooldown 7j gère le cas normal).
  // peek (pur) à l'init, clear dans un effet (séparation requise pour React StrictMode).
  const [hidden, setHidden] = useState(peekSkipPushPromptOnce)
  useEffect(() => {
    clearSkipPushPromptOnce()
  }, [])

  const onDashboard = pathname === '/dashboard'
  const visible = onDashboard && shouldShowPrePrompt && consentResolved && !hidden

  // Analytics : pre-prompt affiché (une fois par affichage).
  const shownRef = useRef(false)
  useEffect(() => {
    if (!visible) {
      shownRef.current = false
      return
    }
    if (shownRef.current) return
    shownRef.current = true
    try {
      analyticsEvents.push.optInPromptShown(capability)
    } catch {
      /* analytics no-op safe */
    }
  }, [visible, capability])

  const handleAccept = async () => {
    const result = await requestOptIn()
    setHidden(true)
    if (result === 'subscribed') {
      analyticsEvents.push.optInAccepted(capability)
      toast.success({ title: t('toastSuccess.title'), message: t('toastSuccess.message') })
    } else if (result === 'denied') {
      analyticsEvents.push.optInDismissed({ reason: 'denied' })
      toast.error({ title: t('toastBlocked.title'), message: t('toastBlocked.message') })
    } else {
      // unsupported / no-vapid-key / error : feedback discret, pas de blocage (in-app couvre).
      analyticsEvents.push.optInDismissed({ reason: result })
      toast.error({ title: t('toastError.title'), message: t('toastError.message') })
    }
  }

  const handleDismiss = () => {
    analyticsEvents.push.optInDismissed({ reason: 'later' })
    dismiss()
    setHidden(true)
  }

  if (!visible) return null

  return <PushOptInSheet open={visible} onAccept={handleAccept} onDismiss={handleDismiss} />
}

/**
 * Point de montage du pre-prompt push. Enrobé d'un ErrorBoundary (jamais de crash du
 * dashboard). Le Suspense fournit un fallback null en attente d'hydratation.
 */
export function PushOptInMount() {
  return (
    <PushOptInErrorBoundary>
      <Suspense fallback={null}>
        <PushOptInInner />
      </Suspense>
    </PushOptInErrorBoundary>
  )
}
