'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'

import type { PwaCase } from '@evolve/types'

import { detectPwaCase } from '@/lib/pwa/platform-detection'
import { canSubscribeOnPlatform, readNotificationPermission } from './permission'
import { pushDismissStore } from './dismiss-storage'
import { subscribePush, type SubscribeResult } from './subscribe'
import type { PushPlatformCapability } from './platform-push'

/**
 * Hook du pre-prompt Web Push (PUSH-001 ; spec §6.3) — opt-in EXPLICITE.
 *
 * Détection plateforme via `useSyncExternalStore` (SSR-safe) : snapshot serveur figé à
 * `'unsupported'`, snapshot client résolu après hydratation (mirror `usePwaInstall`). Le
 * store n'émet jamais (la plateforme ne change pas en session) → `subscribe` no-op.
 *
 * Crash-safety : tout effet de bord (storage, requestPermission, fetch) est gardé. Aucune
 * exception ne remonte à React ; on n'affiche jamais le pre-prompt en cas d'erreur.
 *
 * NB : `subscribePush()` retourne 'unsupported' en localhost dev (SW prod-only) — le vrai
 * push se teste sur un déploiement HTTPS avec NEXT_PUBLIC_VAPID_PUBLIC_KEY.
 */
const NOOP_SUBSCRIBE = (): (() => void) => () => {}
const getClientPwaCase = (): PwaCase => detectPwaCase()
const getServerPwaCase = (): PwaCase => 'unsupported'

/**
 * Éligibilité cooldown via `useSyncExternalStore` (même pattern que pwaCase) : snapshot
 * serveur figé à `false` (pas d'accès localStorage au render SSR), snapshot client résolu
 * après hydratation. Évite tout `setState` synchrone dans un effet (régression cascading
 * renders, cf. R-035 / set-state-in-effect). Le store n'émet pas (lecture ponctuelle).
 */
const getClientCooldownEligible = (): boolean => {
  try {
    return pushDismissStore.getCooldownUntil() <= Date.now()
  } catch {
    return false
  }
}
const getServerCooldownEligible = (): boolean => false

/**
 * Décision PURE d'affichage du pre-prompt (PUSH-001 ; spec §6.3/§6.4) — extraite pour
 * être testable sans React.
 *
 * Règle non négociable : on ne re-prompte JAMAIS une fois la permission décidée. Seul
 * `permission === 'default'` (décision en attente) autorise l'affichage — `granted` (déjà
 * abonné) comme `denied` (refusé) masquent définitivement le pre-prompt maison. Sans ce
 * garde, un appareil ayant ACCORDÉ la permission restait `capability === 'ready'` et le
 * pre-prompt se ré-affichait à chaque reload (aucun cooldown n'étant posé à l'acceptation).
 */
export function shouldShowPushPrePrompt(args: {
  capability: PushPlatformCapability
  permission: NotificationPermission
  eligibleByCooldown: boolean
  hidden: boolean
}): boolean {
  return (
    args.capability === 'ready' &&
    args.permission === 'default' &&
    args.eligibleByCooldown &&
    !args.hidden
  )
}

export type UsePushOptInReturn = {
  /** Capacité de l'appareil (unsupported / needs_pwa_install / needs_safari / blocked / ready). */
  capability: PushPlatformCapability
  /** Vrai si le pre-prompt doit s'afficher (ready + permission 'default' + cooldown expiré + non masqué). */
  shouldShowPrePrompt: boolean
  /** Lance le flux requestPermission → subscribe → POST. Retourne le code de résultat. */
  requestOptIn: () => Promise<SubscribeResult>
  /** « Plus tard » : enregistre un cooldown 7 j et masque le pre-prompt sur cet appareil. */
  dismiss: () => void
}

export function usePushOptIn(): UsePushOptInReturn {
  // Détection + cooldown via useSyncExternalStore (SSR-safe, pas de setState en effet).
  const pwaCase = useSyncExternalStore(NOOP_SUBSCRIBE, getClientPwaCase, getServerPwaCase)
  const eligibleByCooldown = useSyncExternalStore(
    NOOP_SUBSCRIBE,
    getClientCooldownEligible,
    getServerCooldownEligible
  )
  const [hidden, setHidden] = useState(false)

  // Permission Notification lue au render (gardée crash-safe). Côté serveur → 'default'.
  let permission: NotificationPermission = 'default'
  try {
    permission = readNotificationPermission()
  } catch {
    permission = 'default'
  }

  // Capacité dérivée du render (pure : pwaCase + permission Notification, gardée crash-safe).
  // Côté serveur, pwaCase = 'unsupported' → canSubscribeOnPlatform → 'unsupported'.
  let capability: PushPlatformCapability = 'unsupported'
  try {
    capability = canSubscribeOnPlatform(pwaCase, permission)
  } catch {
    capability = 'unsupported'
  }

  // Le pre-prompt maison ne s'affiche QUE si l'appareil peut s'abonner immédiatement
  // (`ready`) ET que la permission n'est pas encore décidée (`default`). Les cas iOS
  // (needs_pwa_install / needs_safari) sont gérés par le fallback (réutilise PwaInstallSheet) ;
  // `unsupported`/`blocked`/`granted` n'affichent rien (granted = déjà abonné, ne pas re-prompter).
  const shouldShowPrePrompt = shouldShowPushPrePrompt({
    capability,
    permission,
    eligibleByCooldown,
    hidden,
  })

  const requestOptIn = useCallback(async (): Promise<SubscribeResult> => {
    setHidden(true)
    try {
      return await subscribePush()
    } catch {
      return 'error'
    }
  }, [])

  const dismiss = useCallback(() => {
    try {
      pushDismissStore.recordDismiss()
    } catch {
      /* noop — un storage indisponible ne doit jamais crasher le dismiss */
    }
    setHidden(true)
  }, [])

  return { capability, shouldShowPrePrompt, requestOptIn, dismiss }
}
