import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import createNextIntlPlugin from 'next-intl/plugin'

// next-intl : charge la config de requête (locale via cookie, FR par défaut).
// Mode « without i18n routing » → pas de segment [locale], pas de changement d'URL.
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

// ──────────────────────────────────────────────────────────────────────────────
// Sécurité HTTP — headers + Content Security Policy (OPS-004)
// ──────────────────────────────────────────────────────────────────────────────
// Doc complète + rationale directive par directive : docs/security/headers.md.
const isDev = process.env.NODE_ENV === 'development'

/**
 * Dérive les origines Supabase à autoriser dans `connect-src` à partir de
 * NEXT_PUBLIC_SUPABASE_URL (REST/Auth/Storage en https + Realtime en wss).
 *
 * - En prod : la vraie URL projet (https://xxx.supabase.co → + wss://xxx.supabase.co).
 * - En CI/build : un placeholder ou rien → fallback localhost local (inoffensif).
 * - En dev local : http://127.0.0.1:54321 → on autorise aussi ws://127.0.0.1:54321.
 *
 * On dérive l'origine websocket en remplaçant le schéma (https→wss, http→ws) :
 * pas de host codé en dur, la CSP suit l'env automatiquement.
 */
function supabaseConnectSources(): string[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  const sources = new Set<string>()
  if (raw) {
    try {
      const url = new URL(raw)
      sources.add(url.origin) // https://… ou http://127.0.0.1:54321
      const wsScheme = url.protocol === 'https:' ? 'wss:' : 'ws:'
      sources.add(`${wsScheme}//${url.host}`) // Realtime websockets
    } catch {
      // URL malformée (placeholder build) : on n'ajoute rien, fallback dev ci-dessous.
    }
  }
  // Filet de sécurité en dev si l'URL est absente : la stack Supabase CLI locale.
  if (isDev) {
    sources.add('http://127.0.0.1:54321')
    sources.add('ws://127.0.0.1:54321')
  }
  return [...sources]
}

/**
 * Assemble la Content-Security-Policy.
 *
 * Stratégie : stricte en production, plus permissive en développement
 * (HMR Next exige 'unsafe-eval' + websockets/HTTP localhost). On NE bloque
 * jamais le dev. Chaque directive est commentée dans docs/security/headers.md.
 */
function buildCsp(): string {
  const connectSrc = [
    "'self'",
    ...supabaseConnectSources(), // REST/Auth/Storage https + Realtime wss
    'https://cloudflareinsights.com', // beacon Cloudflare POST les métriques ici (OPS-002)
    'https://*.ingest.sentry.io', // ingestion Sentry via le DSN (OPS-001)
  ]
  const scriptSrc = [
    "'self'",
    // 'unsafe-inline' : script anti-flash thème (dangerouslySetInnerHTML) dans layout.tsx.
    // Compromis pragmatique documenté ; nonce per-request via middleware = amélioration V1.
    "'unsafe-inline'",
    'https://static.cloudflareinsights.com', // beacon.min.js (OPS-002)
  ]
  if (isDev) {
    // HMR / React Refresh de Next en dev s'appuie sur eval + websockets localhost.
    scriptSrc.push("'unsafe-eval'")
    connectSrc.push('ws://localhost:*', 'http://localhost:*')
  }

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': connectSrc,
    // Verrous de durcissement : aucun plugin/embed, l'app n'est jamais iframée,
    // <base> et les soumissions de formulaires restent sur l'origine.
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  }

  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ')
}

/**
 * Headers de sécurité appliqués à TOUTES les routes (`/:path*`).
 * HSTS reste inoffensif en dev (http non concerné par le mécanisme).
 */
const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: buildCsp() },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
]

// Objet de config Next « pur » — gardé extensible. OPS-004 y branche `async headers()`.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@evolve/ui',
    '@evolve/data',
    '@evolve/design-system',
    '@evolve/types',
    '@evolve/utils',
  ],
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }]
  },
}

// Options de build Sentry (webpack/turbopack plugin). Sûres par défaut :
//   - silent hors CI : pas de bruit dans les logs locaux.
//   - widenClientFileUpload : meilleure résolution des source maps client.
//   - removeDebugLogging : tree-shake le logger interne du SDK (remplace l'option
//     `disableLogger` dépréciée en v10 ; sans effet sous Turbopack, actif en build webpack).
//   - org/project/authToken : lus depuis l'env. L'UPLOAD des source maps ne se fait QUE si
//     SENTRY_AUTH_TOKEN est présent (CI) ; sinon le plugin skip silencieusement, le build
//     ne casse jamais (cas dev + build CI sans secret).
const sentryBuildOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: { treeshake: { removeDebugLogging: true } },
}

export default withSentryConfig(withNextIntl(nextConfig), sentryBuildOptions)
