/**
 * Helper analytics GA4 (UBA — Phase 2). Émet vers `window.gtag('event', …)`.
 *
 * Vie privée (cf. docs/analytics/) : aucun montant exact ni PII en paramètre — uniquement
 * des buckets et des compteurs. Le `user_id` (pseudonyme haché) n'est posé QUE si le
 * consentement « Mesure d'audience » est accordé (cf. AnalyticsIdentify). Consent Mode v2
 * module la confidentialité : avant consentement, gtag n'émet que des pings cookieless.
 *
 * Sans GA chargé (NEXT_PUBLIC_GA_ID_APP absent en dev/CI) → no-op sûr (gtag indéfini).
 */

type GtagFn = (...args: unknown[]) => void

declare global {
  interface Window {
    gtag?: GtagFn
  }
}

function gtag(): GtagFn | null {
  if (typeof window === 'undefined') return null
  return typeof window.gtag === 'function' ? window.gtag : null
}

/** Émet un event GA4. Paramètres : valeurs catégorielles / buckets uniquement (jamais de PII). */
export function track(name: string, params?: Record<string, unknown>): void {
  gtag()?.('event', name, params)
}

/** Pose le user_id pseudonyme + les user properties (à appeler UNIQUEMENT si consenti). */
export function setAnalyticsUser(userIdHash: string, props: Record<string, unknown>): void {
  const g = gtag()
  if (!g) return
  g('set', { user_id: userIdHash })
  g('set', 'user_properties', props)
}

/** Retire le user_id (logout / retrait de consentement). */
export function clearAnalyticsUser(): void {
  gtag()?.('set', { user_id: null })
}

// ─── Bucketisation (jamais de valeur exacte vers GA) ───
export function valueBucket(eur: number | null | undefined): string {
  if (eur == null || !Number.isFinite(eur)) return 'unknown'
  if (eur < 10_000) return '<10k'
  if (eur < 50_000) return '10-50k'
  if (eur < 100_000) return '50-100k'
  return '>100k'
}

export function countBucket(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return 'unknown'
  if (n <= 5) return '1-5'
  if (n <= 10) return '6-10'
  if (n <= 20) return '11-20'
  return '>20'
}

/**
 * Catalogue d'events (cf. docs/analytics/PLAN-DE-TAGGAGE.md). 🎯 = key event (conversion).
 * Le bloc `pwa.*` conserve sa signature (utilisé par InstallBannerMount + profil/InstallSection).
 */
export const analyticsEvents = {
  auth: {
    /** 🎯 login_completed — session établie post-magic-link. */
    loginCompleted: (isFirstLogin?: boolean) =>
      track('login_completed', { method: 'magic_link', is_first_login: isFirstLogin ?? undefined }),
    magicLinkSent: () => track('magic_link_requested', {}),
  },
  onboarding: {
    /** 🎯 onboarding_completed — fin du tour → dashboard. */
    completed: () => track('onboarding_completed', {}),
  },
  // Expérience A/B dashboard V2 : `dashboard_variant` segmente tous les events dashboard.
  // Signatures GELÉES (contrat partagé V1/V2 — cf. PLAN-DE-TAGGAGE.md §3.2).
  dashboard: {
    /** dashboard_viewed — mount de la variante active (fire-once par mount). */
    viewed: (params: {
      variant: 'v1' | 'v2'
      valueBucket: string
      contributionStatus: string
      /** V2 uniquement, omis en V1. */
      chartDataSource?: 'live' | 'demo'
    }) =>
      track('dashboard_viewed', {
        dashboard_variant: params.variant,
        portfolio_value_bucket: params.valueBucket,
        contribution_status: params.contributionStatus,
        chart_data_source: params.chartDataSource,
      }),
    /** dashboard_chart_period_changed — interaction toggle période (V2). */
    chartPeriodChanged: (params: {
      period: '7d' | '30d' | '90d' | '1y' | 'max'
      chartDataSource: 'live' | 'demo'
    }) =>
      track('dashboard_chart_period_changed', {
        dashboard_variant: 'v2',
        period: params.period,
        chart_data_source: params.chartDataSource,
      }),
    /** dashboard_hero_detail_opened — ouverture du détail quote-part. */
    heroDetailOpened: (params: { variant: 'v1' | 'v2' }) =>
      track('dashboard_hero_detail_opened', { dashboard_variant: params.variant }),
  },
  portfolio: {
    /** 🎯 portfolio_viewed — rendu de /portfolio (1ʳᵉ vue = moment « aha »). */
    viewed: (params: { valueBucket: string; positionsBucket: string }) =>
      track('portfolio_viewed', {
        portfolio_value_bucket: params.valueBucket,
        positions_count_bucket: params.positionsBucket,
      }),
  },
  attestation: {
    /** 🎯 attestation_download — téléchargement de l'attestation de détention. */
    downloaded: (params?: { triggerSource?: 'in_app' | 'email' }) =>
      track('attestation_download', {
        document_type: 'detention',
        trigger_source: params?.triggerSource ?? 'in_app',
      }),
  },
  sync: {
    manualTrigger: () => track('sync_triggered', { trigger_source: 'manual' }),
  },
  pdf: {
    download: (document: string) => track('attestation_download', { document_type: document }),
  },
  pwa: {
    bannerShown: (pwaCase: string, visitCount: number, dismissCount: number) =>
      track('pwa_install_prompt_shown', {
        pwa_case: pwaCase,
        visit_count: visitCount,
        dismiss_count: dismissCount,
      }),
    ctaClicked: (pwaCase: string) => track('pwa_install_cta_clicked', { pwa_case: pwaCase }),
    dismissed: (pwaCase: string, dismissCount: number) =>
      track('pwa_install_dismissed', { pwa_case: pwaCase, dismiss_count: dismissCount }),
    installCompleted: (pwaCase: string) => track('pwa_install_accepted', { pwa_case: pwaCase }),
    iosInstructionsViewed: (pwaCase: string, step: number) =>
      track('pwa_ios_instructions_viewed', { pwa_case: pwaCase, step }),
    clipboardCopied: () => track('pwa_clipboard_copied', {}),
  },
} as const
