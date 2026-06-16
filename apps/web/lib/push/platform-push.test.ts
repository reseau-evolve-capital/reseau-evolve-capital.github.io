import { describe, it, expect } from 'vitest'

import type { PwaCase } from '@evolve/types'

import { capabilityForPwaCase } from './platform-push'

describe('capabilityForPwaCase', () => {
  it('iOS Safari hors écran d’accueil → needs_pwa_install', () =>
    expect(capabilityForPwaCase('ios-safari')).toBe('needs_pwa_install'))

  it('iOS non-Safari (Chrome/Firefox) → needs_safari', () =>
    expect(capabilityForPwaCase('ios-other')).toBe('needs_safari'))

  it('unsupported reste unsupported', () =>
    expect(capabilityForPwaCase('unsupported')).toBe('unsupported'))

  it('standalone (PWA iOS installée) → ready', () =>
    expect(capabilityForPwaCase('standalone')).toBe('ready'))

  it('android-chrome → ready', () => expect(capabilityForPwaCase('android-chrome')).toBe('ready'))

  it('desktop → ready', () => expect(capabilityForPwaCase('desktop')).toBe('ready'))

  it('couvre tous les PwaCase de l’union', () => {
    const cases: PwaCase[] = [
      'android-chrome',
      'ios-safari',
      'ios-other',
      'standalone',
      'desktop',
      'unsupported',
    ]
    for (const c of cases) {
      expect(['unsupported', 'needs_pwa_install', 'needs_safari', 'ready']).toContain(
        capabilityForPwaCase(c)
      )
    }
  })
})
