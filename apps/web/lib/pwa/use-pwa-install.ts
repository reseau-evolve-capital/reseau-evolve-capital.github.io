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

/** Actions PWA sans la machine de trigger/visite — réutilisable hors dashboard (ex. /profil). */
export type PwaActions = {
  pwaCase: PwaCase
  isInstructionModalOpen: boolean
  promptInstall: () => Promise<PromptOutcome>
  openInstructionModal: () => void
  closeInstructionModal: () => void
  dismiss: () => void
  copyUrlToClipboard: () => Promise<boolean>
}

export type UsePwaInstallReturn = PwaActions & {
  shouldShowBanner: boolean
}

/**
 * Détection + actions PWA, SANS comptage de visite ni timer de bannière. À utiliser là où
 * l'on veut déclencher l'install à la demande (section /profil) sans armer la logique de la
 * bannière du dashboard (qui, elle, incrémente le compteur de visites).
 *
 * Crash-safety : tous les effets de bord (prompt natif, clipboard, storage) sont gardés en
 * try/catch — jamais de throw dans l'arbre React.
 */
export function usePwaActions(): PwaActions {
  const pwaCase = useSyncExternalStore(NOOP_SUBSCRIBE, getClientPwaCase, getServerPwaCase)
  const [isInstructionModalOpen, setInstructionModalOpen] = useState(false)

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
    isInstructionModalOpen,
    promptInstall,
    openInstructionModal,
    closeInstructionModal,
    dismiss,
    copyUrlToClipboard,
  }
}

/**
 * Hook racine de la bannière PWA (spec §2) : actions PWA + machine de trigger (visite≥2,
 * cooldown, timer 8 s gaté focus/visibilité). Exposé tel quel à `InstallBannerMount`.
 */
export function usePwaInstall(): UsePwaInstallReturn {
  const actions = usePwaActions()
  const { shouldShow } = useInstallBannerState(actions.pwaCase)
  return { ...actions, shouldShowBanner: shouldShow }
}
