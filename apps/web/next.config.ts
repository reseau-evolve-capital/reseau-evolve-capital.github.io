import type { NextConfig } from 'next'

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

export default nextConfig
