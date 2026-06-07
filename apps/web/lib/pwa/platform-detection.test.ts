import { describe, it, expect } from 'vitest'

import { detectPwaCase } from './platform-detection'

const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36'
const IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IOS_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126 Mobile/15E148 Safari/604.1'
const IOS_FF =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/126 Mobile/15E148 Safari/604.1'
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const IPAD_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'

const env = (ua: string, standalone = false, maxTouchPoints = 0, navStandalone = false) => ({
  userAgent: ua,
  isStandaloneDisplay: standalone,
  maxTouchPoints,
  navigatorStandalone: navStandalone,
})

describe('detectPwaCase', () => {
  it('returns unsupported when no env (SSR)', () =>
    expect(detectPwaCase(undefined)).toBe('unsupported'))
  it('detects standalone via display-mode', () =>
    expect(detectPwaCase(env(ANDROID, true))).toBe('standalone'))
  it('detects standalone via navigator.standalone (iOS)', () =>
    expect(detectPwaCase(env(IOS_SAFARI, false, 5, true))).toBe('standalone'))
  it('detects android-chrome', () => expect(detectPwaCase(env(ANDROID))).toBe('android-chrome'))
  it('detects ios-safari', () =>
    expect(detectPwaCase(env(IOS_SAFARI, false, 5))).toBe('ios-safari'))
  it('detects ios-other for CriOS', () =>
    expect(detectPwaCase(env(IOS_CHROME, false, 5))).toBe('ios-other'))
  it('detects ios-other for FxiOS', () =>
    expect(detectPwaCase(env(IOS_FF, false, 5))).toBe('ios-other'))
  it('detects ios-safari for iPad desktop-mode', () =>
    expect(detectPwaCase(env(IPAD_DESKTOP, false, 5))).toBe('ios-safari'))
  it('detects desktop for mac safari (no touch)', () =>
    expect(detectPwaCase(env(MAC_SAFARI, false, 0))).toBe('desktop'))
})
