'use client'

import dynamic from 'next/dynamic'

// ssr: false exige un module client ; le registre (components.ts) reste importable depuis un composant serveur.
export const FeaturedClubs = dynamic(() => import('./FeaturedClubs'), { ssr: false })
