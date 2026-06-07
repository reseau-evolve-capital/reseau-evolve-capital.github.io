import { describe, it, expect, beforeEach } from 'vitest'

import { createDismissStore } from './dismiss-storage'

const DAY = 86_400_000

function memStorage(): Storage {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size
    },
  } as Storage
}

function throwingStorage(): Storage {
  return {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
  } as unknown as Storage
}

describe('dismiss store', () => {
  let now: number
  const clock = () => now
  beforeEach(() => {
    now = 1_700_000_000_000
  })

  it('starts empty', () => {
    const s = createDismissStore({ storage: memStorage(), now: clock })
    expect(s.read().visitCount).toBe(0)
    expect(s.read().dismissCount).toBe(0)
  })
  it('increments visits', () => {
    const s = createDismissStore({ storage: memStorage(), now: clock })
    s.recordVisit('android-chrome')
    s.recordVisit('android-chrome')
    expect(s.read().visitCount).toBe(2)
  })
  it('1st dismiss → +7d cooldown', () => {
    const s = createDismissStore({ storage: memStorage(), now: clock })
    s.recordDismiss('ios-safari')
    expect(s.getCooldownUntil()).toBe(now + 7 * DAY)
    expect(s.read().dismissCount).toBe(1)
  })
  it('2nd dismiss → +30d', () => {
    const s = createDismissStore({ storage: memStorage(), now: clock })
    s.recordDismiss('ios-safari')
    s.recordDismiss('ios-safari')
    expect(s.getCooldownUntil()).toBe(now + 30 * DAY)
  })
  it('3rd dismiss → permanently migrated', () => {
    const s = createDismissStore({ storage: memStorage(), now: clock })
    s.recordDismiss('ios-safari')
    s.recordDismiss('ios-safari')
    s.recordDismiss('ios-safari')
    expect(s.isPermanentlyMigrated()).toBe(true)
  })
  it('android rejected → +3d (shorter)', () => {
    const s = createDismissStore({ storage: memStorage(), now: clock })
    s.recordAndroidRejected()
    expect(s.getCooldownUntil()).toBe(now + 3 * DAY)
  })
  it('appinstalled → installed, never eligible', () => {
    const s = createDismissStore({ storage: memStorage(), now: clock })
    s.recordInstalled()
    expect(s.read().installedAt).not.toBeNull()
  })
  it('throwing storage degrades safely (empty, no throw)', () => {
    const s = createDismissStore({ storage: throwingStorage(), now: clock })
    expect(() => s.recordVisit('android-chrome')).not.toThrow()
    expect(s.read().visitCount).toBe(0)
  })
})
