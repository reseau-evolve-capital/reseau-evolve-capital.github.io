import type { PwaDismissState } from '@evolve/types'

/** Nombre de visites minimum avant de proposer l'installation. */
export const MIN_VISITS = 2
/** Délai (ms) d'onglet visible & focus continu avant d'afficher la bannière. */
export const TRIGGER_DELAY_MS = 2000

/**
 * Éligibilité « froide » (indépendante du focus/timer) :
 * visites ≥ 2, jamais migré définitivement, non installé, cooldown écoulé.
 * Pur — testable sans DOM.
 */
export function computeEligibility(state: PwaDismissState, now: number): boolean {
  if (state.visitCount < MIN_VISITS) return false
  if (state.permanentlyMigratedAt !== null) return false
  if (state.installedAt !== null) return false
  if (state.nextEligibleAt !== null) {
    const until = Date.parse(state.nextEligibleAt)
    if (!Number.isNaN(until) && until > now) return false
  }
  return true
}

/**
 * Abstraction de l'environnement document/window — injectée pour la testabilité.
 * Découple le contrôleur de trigger des globals DOM (pas de jsdom requis en test).
 */
export type TriggerEnv = {
  hasFocus: () => boolean
  visibilityState: () => DocumentVisibilityState
  /** `true` si un champ éditable (input/textarea/select/contenteditable) a le focus. */
  isEditableFocused: () => boolean
  addEventListener: (type: string, cb: () => void) => void
  removeEventListener: (type: string, cb: () => void) => void
}

/**
 * Contrôleur du « trigger » de la bannière : démarre un timer GATÉ par
 * (onglet visible) + (fenêtre focus) + (pas de saisie en cours). Le timer est
 * remis à zéro à chaque `blur`/`visibilitychange` et redémarre quand les
 * conditions redeviennent vraies. Ne déclenche `onTrigger` qu'**une seule fois**.
 *
 * Toute la logique vit ici (pas dans le hook) pour être unit-testable avec
 * `vi.useFakeTimers()` et un environnement factice.
 */
export class BannerTriggerController {
  private timer: ReturnType<typeof setTimeout> | null = null
  private fired = false
  private started = false
  private readonly events = ['visibilitychange', 'blur', 'focus'] as const
  private readonly onEnvChange = () => this.evaluate()

  constructor(
    private readonly env: TriggerEnv,
    private readonly delayMs: number,
    private readonly onTrigger: () => void
  ) {}

  /** Branche les écouteurs et lance une première évaluation. */
  start(): void {
    if (this.started) return
    this.started = true
    for (const type of this.events) this.env.addEventListener(type, this.onEnvChange)
    this.evaluate()
  }

  /** Débranche les écouteurs et annule le timer en cours. */
  stop(): void {
    if (!this.started) return
    this.started = false
    this.clearTimer()
    for (const type of this.events) this.env.removeEventListener(type, this.onEnvChange)
  }

  private canFireNow(): boolean {
    return (
      this.env.hasFocus() &&
      this.env.visibilityState() === 'visible' &&
      !this.env.isEditableFocused()
    )
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private evaluate(): void {
    if (this.fired || !this.started) return
    if (this.canFireNow()) {
      // (re)démarre le compte à rebours seulement si aucun n'est en cours
      if (this.timer === null) {
        this.timer = setTimeout(() => {
          this.timer = null
          if (this.fired || !this.started) return
          // garde finale : les conditions peuvent avoir changé à l'échéance
          if (!this.canFireNow()) return
          this.fired = true
          this.stop()
          this.onTrigger()
        }, this.delayMs)
      }
    } else {
      // conditions perdues → on remet à zéro
      this.clearTimer()
    }
  }
}
