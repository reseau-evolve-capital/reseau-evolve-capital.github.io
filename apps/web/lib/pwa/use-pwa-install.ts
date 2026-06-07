'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'

import type { PromptOutcome, PwaCase } from '@evolve/types'

import { consumeDeferredPrompt } from './beforeinstallprompt-store'
import { detectPwaCase } from './platform-detection'
import { dismissStore } from './dismiss-storage'
import { useInstallBannerState } from './use-install-banner-state'

/**
 * Détection plateforme via `useSyncExternalStore` : snapshot serveur figé à
 * `'unsupported'` (aucun accès `window` au render SSR), snapshot client résolu par
 * `detectPwaCase()` après hydratation. Le store n'émet jamais (la plateforme ne change
 * pas en cours de session), d'où un `subscribe` no-op.
 */
const NOOP_SUBSCRIBE = (): (() => void) => () => {}
const getClientPwaCase = (): PwaCase => detectPwaCase()
const getServerPwaCase = (): PwaCase => 'unsupported'

export type UsePwaInstallReturn = {
  pwaCase: PwaCase
  shouldShowBanner: boolean
  isInstructionModalOpen: boolean
  promptInstall: () => Promise<PromptOutcome>
  openInstructionModal: () => void
  closeInstructionModal: () => void
  dismiss: () => void
  copyUrlToClipboard: () => Promise<boolean>
}

/**
 * Hook racine de la bannière PWA : compose détection plateforme + store de refus +
 * capture `beforeinstallprompt` + machine de trigger, et expose l'API publique (spec §2).
 *
 * Crash-safety : `pwaCase` démarre à `'unsupported'` au render SSR/premier paint puis se
 * résout au mount (aucun accès `window`/`navigator` pendant le render). Tous les effets de
 * bord (prompt natif, clipboard, storage) sont gardés en try/catch — jamais de throw React.
 */
export function usePwaInstall(): UsePwaInstallReturn {
  const pwaCase = useSyncExternalStore(NOOP_SUBSCRIBE, getClientPwaCase, getServerPwaCase)
  const [isInstructionModalOpen, setInstructionModalOpen] = useState(false)

  const { shouldShow } = useInstallBannerState(pwaCase)

  const promptInstall = useCallback(async (): Promise<PromptOutcome> => {
    const event = consumeDeferredPrompt()
    if (!event) return 'unavailable'
    try {
      await event.prompt()
      const { outcome } = await event.userChoice
      if (outcome === 'dismissed') {
        // Refus du prompt natif → cooldown court (3 j).
        try {
          dismissStore.recordAndroidRejected()
        } catch {
          /* noop */
        }
      }
      // 'accepted' : le store est mis à jour par l'event `appinstalled` (recordInstalled).
      return outcome
    } catch {
      return 'unavailable'
    }
  }, [])

  const openInstructionModal = useCallback(() => setInstructionModalOpen(true), [])
  const closeInstructionModal = useCallback(() => setInstructionModalOpen(false), [])

  const dismiss = useCallback(() => {
    try {
      dismissStore.recordDismiss(pwaCase)
    } catch {
      /* noop — un storage indisponible ne doit jamais crasher le dismiss */
    }
  }, [pwaCase])

  const copyUrlToClipboard = useCallback(async (): Promise<boolean> => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) return false
      await navigator.clipboard.writeText(window.location.href)
      return true
    } catch {
      return false
    }
  }, [])

  return {
    pwaCase,
    shouldShowBanner: shouldShow,
    isInstructionModalOpen,
    promptInstall,
    openInstructionModal,
    closeInstructionModal,
    dismiss,
    copyUrlToClipboard,
  }
}
