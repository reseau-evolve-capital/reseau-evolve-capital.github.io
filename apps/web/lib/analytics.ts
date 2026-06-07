/**
 * Helper analytics (OPS-002) — parité d'API avec la vitrine.
 *
 * ⚠ LIMITE HONNÊTE : Cloudflare Web Analytics (offre gratuite) NE fournit PAS d'API
 * d'events custom. Le beacon `beacon.min.js` ne définit pas `window.cfAnalytics`, donc
 * `trackEvent()` est un NO-OP sûr en l'état (la garde `window.cfAnalytics` est toujours
 * fausse). On expose tout de même ce helper pour la parité d'API avec apps/vitrine et
 * pour ne pas avoir à réécrire les appels si l'on adopte un provider à events en V1.
 * Cf. docs/analytics.md.
 */

type AnalyticsEvent = {
  type: string
  category: string
  action: string
  label?: string
  value?: number
}

declare global {
  interface Window {
    cfAnalytics?: {
      pushEvent: (event: AnalyticsEvent) => void
    }
  }
}

/**
 * Pousse un event analytics si un provider à events est présent.
 * Aujourd'hui no-op (Cloudflare Web Analytics ne pose pas `window.cfAnalytics`).
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window !== 'undefined' && window.cfAnalytics) {
    window.cfAnalytics.pushEvent(event)
  }
}

/**
 * Events métier candidats (backlog Umami historique). NON remontés par Cloudflare
 * Web Analytics — fournis pour la parité d'API uniquement (cf. limite ci-dessus).
 */
export const analyticsEvents = {
  portfolio: {
    view: () =>
      trackEvent({
        type: 'event',
        category: 'Portfolio',
        action: 'View',
      }),
  },
  sync: {
    manualTrigger: () =>
      trackEvent({
        type: 'event',
        category: 'Sync',
        action: 'Manual Trigger',
      }),
  },
  pdf: {
    download: (document: string) =>
      trackEvent({
        type: 'event',
        category: 'PDF',
        action: 'Download',
        label: document,
      }),
  },
  auth: {
    magicLinkSent: () =>
      trackEvent({
        type: 'event',
        category: 'Auth',
        action: 'Magic Link Sent',
      }),
  },
  // PWA-001 — instrumentation bannière d'installation. NON remontés par Cloudflare
  // Web Analytics (no-op) ; prêts pour un provider à events en V1 (cf. limite en tête).
  pwa: {
    bannerShown: (pwaCase: string, visitCount: number, dismissCount: number) =>
      trackEvent({
        type: 'event',
        category: 'PWA',
        action: 'Banner Shown',
        label: pwaCase,
        value: visitCount * 100 + dismissCount,
      }),
    ctaClicked: (pwaCase: string) =>
      trackEvent({ type: 'event', category: 'PWA', action: 'Banner CTA Clicked', label: pwaCase }),
    dismissed: (pwaCase: string, dismissCount: number) =>
      trackEvent({
        type: 'event',
        category: 'PWA',
        action: 'Banner Dismissed',
        label: pwaCase,
        value: dismissCount,
      }),
    installCompleted: (pwaCase: string) =>
      trackEvent({ type: 'event', category: 'PWA', action: 'Install Completed', label: pwaCase }),
    iosInstructionsViewed: (pwaCase: string, step: number) =>
      trackEvent({
        type: 'event',
        category: 'PWA',
        action: 'iOS Instructions Viewed',
        label: pwaCase,
        value: step,
      }),
    clipboardCopied: () =>
      trackEvent({ type: 'event', category: 'PWA', action: 'Clipboard Copied' }),
  },
} as const
