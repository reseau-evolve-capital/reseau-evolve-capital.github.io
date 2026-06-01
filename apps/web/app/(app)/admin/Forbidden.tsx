'use client'

// État 403 de l'espace admin. Réutilise EmptyState (a11y déjà couverte) — pas de nouveau
// composant packages/ui. Ne révèle aucune info sensible (message générique).
import { useRouter } from 'next/navigation'
import { EmptyState } from '@evolve/ui'

export function Forbidden() {
  const router = useRouter()
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <EmptyState
        icon="Lock"
        title="Accès refusé"
        description="Cet espace est réservé aux trésoriers du club."
        action={{ label: 'Retour au dashboard', onClick: () => router.push('/dashboard') }}
      />
    </div>
  )
}
