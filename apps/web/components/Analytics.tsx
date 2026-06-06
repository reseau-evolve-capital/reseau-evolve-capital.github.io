'use client'

import Script from 'next/script'

/**
 * Cloudflare Web Analytics (OPS-002).
 *
 * Charge le beacon Cloudflare côté client. Le beacon capte automatiquement les
 * pageviews ET les navigations SPA (App Router) — aucun cookie posé, IP anonymisée,
 * donc pas de bandeau de consentement requis (cf. docs/analytics.md).
 *
 * Le token vit dans NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN (apps/web/.env.local,
 * gitignoré). Absent (dev/CI sans token) → on ne rend RIEN : pas de beacon avec
 * token vide, no-op sûr.
 *
 * ⚠ OPS-004 (CSP) devra allowlister `static.cloudflareinsights.com` (script-src)
 * et `cloudflareinsights.com` (connect-src, endpoint du beacon).
 */
export function Analytics() {
  const token = process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN

  if (!token) {
    return null
  }

  return (
    <Script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
      strategy="afterInteractive"
    />
  )
}
