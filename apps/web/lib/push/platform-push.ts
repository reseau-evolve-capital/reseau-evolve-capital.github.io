// Capacité plateforme Web Push (PUSH-001 ; spec §6.4).
//
// Mappe un PwaCase (détection partagée PWA-001) vers une capacité push. Pur et testable :
// aucune lecture de `window` ici — l'appelant (`canSubscribeOnPlatform`) compose la
// détection runtime + la permission Notification. Ce module ne décide QUE de la dimension
// plateforme (l'iOS sans écran d'accueil ne peut pas recevoir de push tant que la PWA
// n'est pas installée — cf. matrice spec §1.3).

import type { PwaCase } from '@evolve/types'

/**
 * Capacité push résolue :
 *  - `unsupported`      : API absente (pas de Notification/PushManager) ou env serveur
 *  - `needs_pwa_install`: iOS Safari hors écran d'accueil → installer la PWA d'abord
 *  - `needs_safari`     : iOS non-Safari (Chrome/Firefox iOS) → passer par Safari
 *  - `blocked`          : permission refusée par l'utilisateur
 *  - `ready`            : peut s'abonner immédiatement
 */
export type PushPlatformCapability =
  | 'unsupported'
  | 'needs_pwa_install'
  | 'needs_safari'
  | 'blocked'
  | 'ready'

/**
 * Dimension PLATEFORME de la capacité push (sans la permission).
 * Pur : `pwaCase` provient de `detectPwaCase()`.
 *
 * - `ios-safari` (Safari iOS hors standalone) → `needs_pwa_install`
 * - `ios-other` (Chrome/Firefox iOS) → `needs_safari`
 * - `unsupported` → `unsupported`
 * - `standalone` / `android-chrome` / `desktop` → `ready`
 */
export function capabilityForPwaCase(pwaCase: PwaCase): PushPlatformCapability {
  switch (pwaCase) {
    case 'ios-safari':
      return 'needs_pwa_install'
    case 'ios-other':
      return 'needs_safari'
    case 'unsupported':
      return 'unsupported'
    default:
      // standalone (iOS PWA installée), android-chrome, desktop
      return 'ready'
  }
}
