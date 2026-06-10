'use client'

import { useEffect, useState } from 'react'

import type { PwaCase, PwaPromptableCase } from '@evolve/types'

import { dismissStore } from './dismiss-storage'
import { wasInstalled } from './beforeinstallprompt-store'
import {
  BannerTriggerController,
  TRIGGER_DELAY_MS,
  computeEligibility,
  type TriggerEnv,
} from './install-banner-trigger'

const PROMPTABLE: ReadonlySet<PwaCase> = new Set<PwaCase>([
  'android-chrome',
  'ios-safari',
  'ios-other',
])

function isPromptable(pwaCase: PwaCase): pwaCase is PwaPromptableCase {
  return PROMPTABLE.has(pwaCase)
}

/**
 * Override du délai de trigger via `window.__PWA_TRIGGER_DELAY_MS__` — seam de test
 * uniquement (E2E déterministes sans attendre le délai réel). Jamais posé en prod.
 */
function readTriggerDelayOverride(): number | null {
  if (typeof window === 'undefined') return null
  const v = (window as unknown as { __PWA_TRIGGER_DELAY_MS__?: unknown }).__PWA_TRIGGER_DELAY_MS__
  return typeof v === 'number' && v >= 0 ? v : null
}

/** `true` si l'élément focus est un champ de saisie — on n'interrompt jamais une saisie. */
function isEditableElementFocused(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return el instanceof HTMLElement && el.isContentEditable
}

/** Adapte les globals `document`/`window` vers l'interface testable `TriggerEnv`. */
function browserTriggerEnv(): TriggerEnv {
  return {
    hasFocus: () => {
      try {
        // Seam de test : `window.__PWA_FORCE_FOCUS__` force le focus pour des E2E déterministes
        // (un navigateur headless n'a pas toujours le focus OS → document.hasFocus() false). Jamais posé en prod.
        const forced = (window as unknown as { __PWA_FORCE_FOCUS__?: unknown }).__PWA_FORCE_FOCUS__
        if (forced === true) return true
        return document.hasFocus()
      } catch {
        return false
      }
    },
    visibilityState: () => (typeof document === 'undefined' ? 'hidden' : document.visibilityState),
    isEditableFocused: isEditableElementFocused,
    addEventListener: (type, cb) => {
      // visibilitychange vit sur document ; focus/blur sur window.
      if (type === 'visibilitychange') document.addEventListener(type, cb)
      else window.addEventListener(type, cb)
    },
    removeEventListener: (type, cb) => {
      if (type === 'visibilitychange') document.removeEventListener(type, cb)
      else window.removeEventListener(type, cb)
    },
  }
}

export type UseInstallBannerState = {
  /** `true` une fois toutes les conditions réunies (à mapper en affichage par le mount). */
  shouldShow: boolean
}

/** Options du hook de bannière PWA. */
export type UseInstallBannerStateOptions = {
  /**
   * Affichage immédiat forcé : délai 0 ET bypass de l'éligibilité froide (compteur de visites,
   * cooldown, dismiss permanent). Utilisé à l'arrivée fraîchement connecté en Safari
   * (`/dashboard?pwa=ios`) pour que la bannière d'install iOS apparaisse tout de suite. On
   * exige toujours un cas promptable et NON standalone (jamais de bannière si déjà installé).
   */
  forceImmediate?: boolean
}

/**
 * Hook fin : enregistre la visite (cas promptable & non standalone), calcule
 * l'éligibilité froide, puis arme un {@link BannerTriggerController} (timer 2 s gaté
 * focus/visibilité/non-saisie). Toute la logique testée vit dans `install-banner-trigger.ts` ;
 * ce hook ne fait que câbler le DOM réel et exposer `shouldShow`.
 *
 * SSR-safe : rend `shouldShow=false` au premier render serveur, effets client uniquement.
 */
export function useInstallBannerState(
  pwaCase: PwaCase,
  options: UseInstallBannerStateOptions = {}
): UseInstallBannerState {
  const { forceImmediate = false } = options
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    if (!isPromptable(pwaCase)) return
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    // Compte la visite (une fois par mount sur le dashboard).
    try {
      dismissStore.recordVisit(pwaCase)
    } catch {
      return
    }

    // Jamais de bannière si l'app est déjà installée — vrai aussi en mode forcé.
    if (wasInstalled()) return

    if (forceImmediate) {
      // Bypass de l'éligibilité froide + délai 0 : la bannière s'affiche tout de suite.
      const controller = new BannerTriggerController(browserTriggerEnv(), 0, () => {
        setShouldShow(true)
      })
      controller.start()
      return () => controller.stop()
    }

    // Éligibilité froide.
    const state = dismissStore.read()
    if (!computeEligibility(state, Date.now())) return

    const delay = readTriggerDelayOverride() ?? TRIGGER_DELAY_MS
    const controller = new BannerTriggerController(browserTriggerEnv(), delay, () => {
      setShouldShow(true)
    })
    controller.start()
    return () => controller.stop()
  }, [pwaCase, forceImmediate])

  return { shouldShow }
}
