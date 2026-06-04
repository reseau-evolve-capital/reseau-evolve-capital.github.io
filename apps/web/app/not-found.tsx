import Link from 'next/link'
import { EmptyState } from '@evolve/ui'

// Page 404 brandée FR. Server Component : aucune logique cliente nécessaire.
// On compose EmptyState (icône + titre + description) puis un vrai <Link>
// pour préserver l'accessibilité (lien réel, pas un onClick JS).
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-page p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <EmptyState
          icon="Compass"
          title="Page introuvable"
          description="Cette page n’existe pas ou a été déplacée. Pas d’inquiétude, on te ramène en terrain connu."
        />
        <Link
          href="/dashboard"
          className="inline-flex h-10 min-h-[44px] items-center justify-center gap-2 rounded-md border border-border bg-card px-4 font-body text-[14px] font-semibold text-text transition-all duration-[150ms] hover:bg-neutral-100 focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] active:scale-[0.98] motion-reduce:active:scale-100"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </main>
  )
}
