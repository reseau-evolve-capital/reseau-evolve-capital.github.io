// apps/web/app/manifest.ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Evolve Capital',
    short_name: 'Evolve',
    description: 'Ta quote-part, ton portefeuille de club, tes cotisations — en un geste.',
    lang: 'fr',
    start_url: '/dashboard',
    scope: '/',
    id: '/',
    display: 'standalone',
    orientation: 'portrait',
    // Fond CRÈME (token light --n-100) : splash Android + tuile d'icône cohérents
    // avec les icônes régénérées (décision owner — la tuile noire était illisible).
    background_color: '#F4F4F2',
    theme_color: '#F4F4F2',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
