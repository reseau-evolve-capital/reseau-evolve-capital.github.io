import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { canSubscribeOnPlatform, isPushSupported, readNotificationPermission } from './permission'

// Environnement vitest = 'node' (pas de window). On installe un faux `window`/`navigator`
// exposant les API Web Push, puis on injecte pwaCase + permission dans canSubscribeOnPlatform
// (paramètres testables) — la dimension plateforme prime sur la permission (spec §6.4).

const g = globalThis as unknown as {
  window?: unknown
  navigator?: unknown
  Notification?: unknown
}

function installSupportedEnv(permission: NotificationPermission = 'default') {
  const NotificationStub = { permission }
  g.window = { Notification: NotificationStub, PushManager: function () {} }
  g.navigator = { serviceWorker: {} }
  // `'Notification' in window` + lecture Notification.permission passent par window.Notification.
  g.Notification = NotificationStub
}

function uninstallEnv() {
  delete g.window
  delete g.navigator
  delete g.Notification
}

beforeEach(() => {
  vi.unstubAllEnvs()
})
afterEach(() => {
  uninstallEnv()
})

describe('isPushSupported', () => {
  it('false sans window (SSR)', () => {
    uninstallEnv()
    expect(isPushSupported()).toBe(false)
  })

  it('true quand Notification + PushManager + serviceWorker présents', () => {
    installSupportedEnv()
    expect(isPushSupported()).toBe(true)
  })
})

describe('readNotificationPermission', () => {
  it("'default' sans window", () => {
    uninstallEnv()
    expect(readNotificationPermission()).toBe('default')
  })

  it('reflète Notification.permission', () => {
    installSupportedEnv('granted')
    expect(readNotificationPermission()).toBe('granted')
  })
})

describe('canSubscribeOnPlatform (spec §6.4)', () => {
  it('API absente (SSR/non supporté) → unsupported', () => {
    uninstallEnv()
    expect(canSubscribeOnPlatform('desktop', 'default')).toBe('unsupported')
  })

  it('iOS Safari hors écran d’accueil → needs_pwa_install (prime sur la permission)', () => {
    installSupportedEnv('granted')
    expect(canSubscribeOnPlatform('ios-safari', 'granted')).toBe('needs_pwa_install')
  })

  it('iOS non-Safari → needs_safari', () => {
    installSupportedEnv('default')
    expect(canSubscribeOnPlatform('ios-other', 'default')).toBe('needs_safari')
  })

  it('permission refusée (desktop) → blocked', () => {
    installSupportedEnv('denied')
    expect(canSubscribeOnPlatform('desktop', 'denied')).toBe('blocked')
  })

  it('desktop + permission default → ready', () => {
    installSupportedEnv('default')
    expect(canSubscribeOnPlatform('desktop', 'default')).toBe('ready')
  })

  it('android-chrome + permission granted → ready', () => {
    installSupportedEnv('granted')
    expect(canSubscribeOnPlatform('android-chrome', 'granted')).toBe('ready')
  })

  it('standalone (PWA iOS installée) + default → ready', () => {
    installSupportedEnv('default')
    expect(canSubscribeOnPlatform('standalone', 'default')).toBe('ready')
  })
})
