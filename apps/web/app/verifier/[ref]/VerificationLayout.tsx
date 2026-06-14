// Coquille présentationnelle de la page de vérification (NTF-004).
//
// Client Component minimal : héberge le logo de marque (servi par l'app) + la carte
// thémée (tokens clair/sombre). Aucune logique métier ici — le résultat (trouvé/inconnu)
// est rendu en `children` par le Server Component parent.

'use client'

import type { ReactNode } from 'react'
import { Logo } from '@evolve/ui'

import { BRAND_LOGO_SRC } from '@/lib/brand'

// Logo de marque servi par l'app (source unique : @/lib/brand → tuile crème).
const LOGO_SRC = BRAND_LOGO_SRC

export interface VerificationLayoutProps {
  reference: string
  title: string
  children: ReactNode
}

export function VerificationLayout({ reference, title, children }: VerificationLayoutProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-12">
      <section className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
        <Logo variant="full" src={LOGO_SRC} className="mb-6" />
        <h1 className="text-xl font-semibold text-text sm:text-2xl">{title}</h1>
        <p className="mt-1 break-all font-mono text-sm text-text-sec">{reference}</p>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  )
}
