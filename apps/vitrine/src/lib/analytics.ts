// Helper analytics GA4 (UBA — Phase 2), version vitrine. Émet vers `window.gtag('event', …)`.
// Aucun PII en paramètre. Sans GA chargé (NEXT_PUBLIC_GA_ID_VITRINE absent) → no-op sûr.
// Consent Mode v2 module la confidentialité (cf. lib/consent.ts + GoogleAnalytics.tsx).

type GtagFn = (...args: unknown[]) => void

declare global {
  interface Window {
    gtag?: GtagFn
  }
}

export function track(name: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (typeof window.gtag === 'function') window.gtag('event', name, params)
}

/** Compat héritée : ancienne signature UA → mappée sur un event GA4. */
type AnalyticsEvent = {
  type: string
  category: string
  action: string
  label?: string
  value?: number
}
export function trackEvent(event: AnalyticsEvent): void {
  const name = `${event.category}_${event.action}`.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  track(name, { label: event.label, value: event.value })
}

export const analyticsEvents = {
  /** 🎯 contact_form_submit (key event) — lead capté via le formulaire de contact. */
  contact: {
    submit: (formLocation: 'contact_page' | 'footer' | 'club' = 'contact_page') =>
      track('contact_form_submit', { form_location: formLocation }),
    error: (errorType: string) => track('contact_form_error', { error_type: errorType }),
  },
  /** 🎯 newsletter_signup (key event) — lead capté via la newsletter. */
  newsletter: {
    signup: (surface: 'popup' | 'inline' | 'footer' = 'popup') =>
      track('newsletter_signup', { surface }),
    error: (errorType: string) => track('newsletter_signup_error', { error_type: errorType }),
  },
  search: {
    performed: (query: string) => track('blog_search', { search_term: query }),
  },
  navigation: {
    ctaClick: (target: string) => track('cta_click', { cta_target: target }),
  },
}
