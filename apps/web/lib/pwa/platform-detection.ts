import type { PwaCase } from '@evolve/types'

/**
 * Environnement de détection — injecté pour la testabilité.
 * Lu une fois côté client via {@link readDetectionEnv}, jamais au render SSR.
 */
export type DetectionEnv = {
  userAgent: string
  isStandaloneDisplay: boolean
  navigatorStandalone: boolean
  maxTouchPoints: number
}

/**
 * Lit l'environnement réel (client uniquement). Renvoie `undefined` côté serveur
 * ou si l'API n'est pas disponible — `detectPwaCase` retombe alors sur `'unsupported'`.
 * Tout est gardé : aucune exception ne peut remonter dans l'arbre React.
 */
export function readDetectionEnv(): DetectionEnv | undefined {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return undefined
  try {
    return {
      userAgent: navigator.userAgent,
      isStandaloneDisplay: window.matchMedia?.('(display-mode: standalone)').matches ?? false,
      navigatorStandalone: (navigator as unknown as { standalone?: boolean }).standalone === true,
      maxTouchPoints: navigator.maxTouchPoints ?? 0,
    }
  } catch {
    return undefined
  }
}

/**
 * Classe l'appareil/navigateur courant en un {@link PwaCase}.
 * Pur et SSR-safe : sans env (serveur ou API indispo) → `'unsupported'`.
 *
 * Ordre des règles (cf. spec §3) :
 * 1. standalone (display-mode ou navigator.standalone) → `'standalone'`
 * 2. iOS (UA iPhone/iPad/iPod, ou iPadOS desktop-mode = Macintosh + touch) :
 *    Safari → `'ios-safari'`, sinon (CriOS/FxiOS/…) → `'ios-other'`
 * 3. Android + Chrome → `'android-chrome'`
 * 4. sinon → `'desktop'`
 */
export function detectPwaCase(env = readDetectionEnv()): PwaCase {
  if (!env) return 'unsupported'
  if (env.isStandaloneDisplay || env.navigatorStandalone) return 'standalone'

  const ua = env.userAgent
  const isClassicIos = /iPhone|iPad|iPod/.test(ua)
  const isIpadDesktop = /Macintosh/.test(ua) && env.maxTouchPoints > 1
  const isIos = isClassicIos || isIpadDesktop
  const isSafari = /^((?!chrome|crios|fxios|android).)*safari/i.test(ua)

  if (isIos) return isSafari ? 'ios-safari' : 'ios-other'
  if (/Android/.test(ua) && /Chrome/.test(ua)) return 'android-chrome'
  return 'desktop'
}

export type IosDevice = 'iphone' | 'ipad'

/**
 * Distingue iPhone et iPad (la modale iOS adapte l'illustration + la légende du Partager).
 * Pur et SSR-safe : sans env → `'iphone'` (cas par défaut, le plus courant).
 */
export function detectIosDevice(env = readDetectionEnv()): IosDevice {
  if (!env) return 'iphone'
  if (/iPad/.test(env.userAgent)) return 'ipad'
  if (/Macintosh/.test(env.userAgent) && env.maxTouchPoints > 1) return 'ipad'
  return 'iphone'
}
