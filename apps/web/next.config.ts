import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

// next-intl : charge la config de requête (locale via cookie, FR par défaut).
// Mode « without i18n routing » → pas de segment [locale], pas de changement d'URL.
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

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

export default withNextIntl(nextConfig)
