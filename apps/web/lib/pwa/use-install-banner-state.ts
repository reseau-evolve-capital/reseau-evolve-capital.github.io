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

/**
 * Hook fin : enregistre la visite (cas promptable & non standalone), calcule
 * l'éligibilité froide, puis arme un {@link BannerTriggerController} (timer 8 s gaté
 * focus/visibilité/non-saisie). Toute la logique testée vit dans `install-banner-trigger.ts` ;
 * ce hook ne fait que câbler le DOM réel et exposer `shouldShow`.
 *
 * SSR-safe : rend `shouldShow=false` au premier render serveur, effets client uniquement.
 */
export function useInstallBannerState(pwaCase: PwaCase): UseInstallBannerState {
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

    // Éligibilité froide.
    const state = dismissStore.read()
    if (wasInstalled()) return
    if (!computeEligibility(state, Date.now())) return

    const controller = new BannerTriggerController(browserTriggerEnv(), TRIGGER_DELAY_MS, () => {
      setShouldShow(true)
    })
    controller.start()
    return () => controller.stop()
  }, [pwaCase])

  return { shouldShow }
}
