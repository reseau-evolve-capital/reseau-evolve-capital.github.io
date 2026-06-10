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

/**
 * Copie l'URL courante dans le presse-papier (comportement historique). Implémentation
 * partagée entre le hook (`copyUrlToClipboard`) et le dernier recours de `copyHandoffLink`.
 * SSR-safe.
 */
async function copyUrlToClipboardImpl(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return false
    await navigator.clipboard.writeText(window.location.href)
    return true
  } catch {
    return false
  }
}

/**
 * Résultat de {@link copyHandoffLink} :
 * - `ok` : quelque chose a bien été copié dans le presse-papier ;
 * - `usedHandoff` : `true` si c'est un lien de connexion portable (auto-login en Safari),
 *   `false` si on a dû retomber sur la copie de l'URL courante (comportement historique).
 */
export type HandoffCopyResult = { ok: boolean; usedHandoff: boolean }

/** Actions PWA sans la machine de trigger/visite — réutilisable hors dashboard (ex. /profil). */
export type PwaActions = {
  pwaCase: PwaCase
  isInstructionModalOpen: boolean
  promptInstall: () => Promise<PromptOutcome>
  openInstructionModal: () => void
  closeInstructionModal: () => void
  dismiss: () => void
  copyUrlToClipboard: () => Promise<boolean>
  copyHandoffLink: () => Promise<HandoffCopyResult>
}

const HANDOFF_ENDPOINT = '/api/auth/handoff-link'

/** Réponse attendue du endpoint de handoff (contrat serveur). */
type HandoffResponse = { url: string }

/**
 * Copie un lien de connexion à usage unique (« device handoff ») minté par le serveur, de
 * sorte qu'un collage dans Safari connecte automatiquement l'utilisateur.
 *
 * ⚠ Contrainte iOS WebKit : `navigator.clipboard.writeText(...)` appelé APRÈS un `await fetch`
 * est souvent rejeté (l'activation transitoire du geste utilisateur a expiré). Le pattern
 * robuste est `navigator.clipboard.write([new ClipboardItem({ 'text/plain': <Promise<Blob>> })])`
 * — Safari accepte une Promise comme valeur de ClipboardItem et la résout en préservant le geste.
 *
 * Stratégie en 3 paliers :
 *  1. `ClipboardItem` + `Promise<Blob>` différée (préserve le geste iOS) ;
 *  2. fallback `fetch` puis `writeText` (non-iOS / `ClipboardItem` indisponible) ;
 *  3. dernier recours : copie de l'URL courante (ancien comportement, `usedHandoff: false`).
 *
 * SSR-safe : gardé par `copyUrlToClipboard` et les checks `navigator`/`ClipboardItem`.
 */
async function copyHandoffLink(): Promise<HandoffCopyResult> {
  // Palier 1 — ClipboardItem avec une Promise<Blob> différée (garde le geste iOS vivant).
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof ClipboardItem !== 'undefined' &&
      navigator.clipboard?.write
    ) {
      const blobPromise = fetch(HANDOFF_ENDPOINT, { method: 'POST' }).then(async (r) => {
        if (!r.ok) throw new Error('handoff_failed')
        const { url } = (await r.json()) as HandoffResponse
        return new Blob([url], { type: 'text/plain' })
      })
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blobPromise })])
      return { ok: true, usedHandoff: true }
    }
  } catch {
    /* on bascule sur le fallback */
  }

  // Palier 2 — fetch puis writeText (non-iOS / ClipboardItem non supporté).
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      const r = await fetch(HANDOFF_ENDPOINT, { method: 'POST' })
      if (r.ok) {
        const { url } = (await r.json()) as HandoffResponse
        await navigator.clipboard.writeText(url)
        return { ok: true, usedHandoff: true }
      }
    }
  } catch {
    /* on bascule sur le dernier recours */
  }

  // Palier 3 — dernier recours : copie de l'URL courante (ancien comportement).
  const ok = await copyUrlToClipboardImpl()
  return { ok, usedHandoff: false }
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

  const copyUrlToClipboard = useCallback(() => copyUrlToClipboardImpl(), [])
  const copyHandoff = useCallback(() => copyHandoffLink(), [])

  return {
    pwaCase,
    isInstructionModalOpen,
    promptInstall,
    openInstructionModal,
    closeInstructionModal,
    dismiss,
    copyUrlToClipboard,
    copyHandoffLink: copyHandoff,
  }
}

// Réexport nommé pour les tests unitaires (logique pure, hors hook).
export { copyHandoffLink }

/** Options du hook racine — propagées à {@link useInstallBannerState}. */
export type UsePwaInstallOptions = {
  /** Affichage immédiat forcé (arrivée `/dashboard?pwa=ios` en Safari). Voir le hook de state. */
  forceImmediate?: boolean
}

/**
 * Hook racine de la bannière PWA (spec §2) : actions PWA + machine de trigger (visite≥2,
 * cooldown, timer 2 s gaté focus/visibilité). Exposé tel quel à `InstallBannerMount`.
 */
export function usePwaInstall(options: UsePwaInstallOptions = {}): UsePwaInstallReturn {
  const actions = usePwaActions()
  const { shouldShow } = useInstallBannerState(actions.pwaCase, {
    forceImmediate: options.forceImmediate,
  })
  return { ...actions, shouldShowBanner: shouldShow }
}
