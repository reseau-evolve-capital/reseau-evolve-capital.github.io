import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import createNextIntlPlugin from 'next-intl/plugin'

// next-intl : charge la config de requête (locale via cookie, FR par défaut).
// Mode « without i18n routing » → pas de segment [locale], pas de changement d'URL.
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

// Objet de config Next « pur » — volontairement gardé simple et extensible : un futur
// ticket (OPS-004) y ajoutera un `async headers()` (CSP). Ne pas y mettre de logique qui
// empêcherait cet ajout.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@evolve/ui',
    '@evolve/data',
    '@evolve/design-system',
    '@evolve/types',
    '@evolve/utils',
  ],
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
