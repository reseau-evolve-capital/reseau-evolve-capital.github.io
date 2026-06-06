import type { NextConfig } from 'next'
import { execSync } from 'node:child_process'

// Date de build (= date de déploiement : build + deploy se font en local, manuellement)
// + commit, injectés dans le bundle pour traçabilité (meta tag <head> + console.info).
const buildTime = new Date().toISOString()
let buildCommit = ''
try {
  buildCommit = execSync('git describe --always --dirty --abbrev=7').toString().trim()
} catch {
  buildCommit = ''
}

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  //basePath: '/omniventus-gh-pages',
  //assetPrefix: '/omniventus-gh-pages/',
  // Enable static generation of locale paths
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BUILD_TIME: buildTime,
    NEXT_PUBLIC_BUILD_COMMIT: buildCommit,
  },
}

export default nextConfig
