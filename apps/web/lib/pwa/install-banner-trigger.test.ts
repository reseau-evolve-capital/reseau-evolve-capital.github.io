import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type { PwaDismissState } from '@evolve/types'

import { computeEligibility, BannerTriggerController } from './install-banner-trigger'

const NOW = 1_700_000_000_000
const DAY = 86_400_000

function state(partial: Partial<PwaDismissState> = {}): PwaDismissState {
  return {
    pwaCase: 'android-chrome',
    visitCount: 2,
    dismissCount: 0,
    lastDismissedAt: null,
    nextEligibleAt: null,
    installedAt: null,
    permanentlyMigratedAt: null,
    ...partial,
  }
}

describe('computeEligibility', () => {
  it('not eligible when visitCount < 2', () => {
    expect(computeEligibility(state({ visitCount: 1 }), NOW)).toBe(false)
  })
  it('eligible at visitCount >= 2 with clean state', () => {
    expect(computeEligibility(state({ visitCount: 2 }), NOW)).toBe(true)
  })
  it('not eligible when permanently migrated', () => {
    expect(
      computeEligibility(state({ permanentlyMigratedAt: new Date(NOW).toISOString() }), NOW)
    ).toBe(false)
  })
  it('not eligible when already installed', () => {
    expect(computeEligibility(state({ installedAt: new Date(NOW).toISOString() }), NOW)).toBe(false)
  })
  it('not eligible while cooldown is active', () => {
    expect(
      computeEligibility(state({ nextEligibleAt: new Date(NOW + 7 * DAY).toISOString() }), NOW)
    ).toBe(false)
  })
  it('eligible once cooldown has elapsed', () => {
    expect(
      computeEligibility(state({ nextEligibleAt: new Date(NOW - 1).toISOString() }), NOW)
    ).toBe(true)
  })
})

/** Doc/Window factice contrôlable pour piloter focus/visibilité/champ actif. */
function makeFakeEnv() {
  const listeners = new Map<string, Set<() => void>>()
  const state = {
    hasFocus: true,
    visibility: 'visible' as DocumentVisibilityState,
    activeEditable: false,
  }
  const target = {
    addEventListener: (type: string, cb: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type)!.add(cb)
    },
    removeEventListener: (type: string, cb: () => void) => {
      listeners.get(type)?.delete(cb)
    },
  }
  return {
    state,
    listeners,
    dispatch(type: string) {
      listeners.get(type)?.forEach((cb) => cb())
    },
    hasListeners() {
      return [...listeners.values()].some((set) => set.size > 0)
    },
    env: {
      hasFocus: () => state.hasFocus,
      visibilityState: () => state.visibility,
      isEditableFocused: () => state.activeEditable,
      addEventListener: target.addEventListener,
      removeEventListener: target.removeEventListener,
    },
  }
}

describe('BannerTriggerController', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('fires onTrigger after the delay when focused & visible', () => {
    const fake = makeFakeEnv()
    const onTrigger = vi.fn()
    const ctrl = new BannerTriggerController(fake.env, 2000, onTrigger)
    ctrl.start()
    expect(onTrigger).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2000)
    expect(onTrigger).toHaveBeenCalledTimes(1)
    ctrl.stop()
  })

  it('does not fire while not focused', () => {
    const fake = makeFakeEnv()
    fake.state.hasFocus = false
    const onTrigger = vi.fn()
    const ctrl = new BannerTriggerController(fake.env, 2000, onTrigger)
    ctrl.start()
    vi.advanceTimersByTime(20_000)
    expect(onTrigger).not.toHaveBeenCalled()
    ctrl.stop()
  })

  it('does not fire while tab is hidden', () => {
    const fake = makeFakeEnv()
    fake.state.visibility = 'hidden'
    const onTrigger = vi.fn()
    const ctrl = new BannerTriggerController(fake.env, 2000, onTrigger)
    ctrl.start()
    vi.advanceTimersByTime(20_000)
    expect(onTrigger).not.toHaveBeenCalled()
    ctrl.stop()
  })

  it('never fires while an editable field is focused', () => {
    const fake = makeFakeEnv()
    fake.state.activeEditable = true
    const onTrigger = vi.fn()
    const ctrl = new BannerTriggerController(fake.env, 2000, onTrigger)
    ctrl.start()
    vi.advanceTimersByTime(20_000)
    expect(onTrigger).not.toHaveBeenCalled()
    ctrl.stop()
  })

  it('resets the timer on blur and restarts on focus', () => {
    const fake = makeFakeEnv()
    const onTrigger = vi.fn()
    const ctrl = new BannerTriggerController(fake.env, 2000, onTrigger)
    ctrl.start()
    vi.advanceTimersByTime(1000)
    // perte de focus → reset
    fake.state.hasFocus = false
    fake.dispatch('blur')
    vi.advanceTimersByTime(1000)
    expect(onTrigger).not.toHaveBeenCalled()
    // retour de focus → on repart de zéro
    fake.state.hasFocus = true
    fake.dispatch('focus')
    vi.advanceTimersByTime(1999)
    expect(onTrigger).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onTrigger).toHaveBeenCalledTimes(1)
    ctrl.stop()
  })

  it('removes all listeners and timers on stop', () => {
    const fake = makeFakeEnv()
    const onTrigger = vi.fn()
    const ctrl = new BannerTriggerController(fake.env, 2000, onTrigger)
    ctrl.start()
    expect(fake.hasListeners()).toBe(true)
    ctrl.stop()
    expect(fake.hasListeners()).toBe(false)
    vi.advanceTimersByTime(20_000)
    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('fires only once even if the timer would re-run', () => {
    const fake = makeFakeEnv()
    const onTrigger = vi.fn()
    const ctrl = new BannerTriggerController(fake.env, 2000, onTrigger)
    ctrl.start()
    vi.advanceTimersByTime(2000)
    fake.dispatch('focus')
    vi.advanceTimersByTime(2000)
    expect(onTrigger).toHaveBeenCalledTimes(1)
    ctrl.stop()
  })
})
