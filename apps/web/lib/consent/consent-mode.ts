// Pilote Google Consent Mode v2 (côté client).
//
// Le DEFAULT (tout denied) est posé inline dans le <head> AVANT le chargement de gtag.js
// (cf. components/analytics/GoogleAnalytics.tsx, Script beforeInteractive). Ici on ne fait que
// l'UPDATE au choix utilisateur. On n'accorde JAMAIS que `analytics_storage` (pas de pub :
// ad_storage / ad_user_data / ad_personalization restent denied — Google Signals OFF).

type GtagFn = (...args: unknown[]) => void

function gtag(): GtagFn | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { gtag?: GtagFn }
  return typeof w.gtag === 'function' ? w.gtag : null
}

/** Met à jour le signal de consentement de mesure d'audience selon le choix utilisateur. */
export function applyAnalyticsConsent(granted: boolean): void {
  gtag()?.('consent', 'update', {
    analytics_storage: granted ? 'granted' : 'denied',
  })
}
