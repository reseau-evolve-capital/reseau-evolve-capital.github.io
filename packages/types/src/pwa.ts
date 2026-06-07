// Types partagés PWA (PWA-001) — utilisés par apps/web (logique) et packages/ui (props).

export type PwaCase =
  | 'android-chrome'
  | 'ios-safari'
  | 'ios-other'
  | 'standalone'
  | 'desktop'
  | 'unsupported'

/** Cas qui peuvent réellement afficher une bannière. */
export type PwaPromptableCase = Extract<PwaCase, 'android-chrome' | 'ios-safari' | 'ios-other'>

export type PwaDismissState = {
  pwaCase: PwaCase
  visitCount: number
  dismissCount: number
  lastDismissedAt: string | null // ISO
  nextEligibleAt: string | null // ISO
  installedAt: string | null // ISO — posé à l'event appinstalled
  permanentlyMigratedAt: string | null // ISO — posé quand dismissCount atteint 3
}

export type PromptOutcome = 'accepted' | 'dismissed' | 'unavailable'
