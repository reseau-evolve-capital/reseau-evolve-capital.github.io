import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { EmptyState } from '@evolve/ui'

// Page 404 brandée. Server Component : aucune logique cliente nécessaire.
// On compose EmptyState (icône + titre + description) puis un vrai <Link>
// pour préserver l'accessibilité (lien réel, pas un onClick JS).
export default async function NotFound() {
  const t = await getTranslations('notFound')
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-page p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <EmptyState icon="Compass" title={t('title')} description={t('description')} />
        <Link
          href="/dashboard"
          className="inline-flex h-10 min-h-[44px] items-center justify-center gap-2 rounded-md border border-border bg-card px-4 font-body text-[14px] font-semibold text-text transition-all duration-[150ms] hover:bg-neutral-100 focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] active:scale-[0.98] motion-reduce:active:scale-100"
        >
          {t('backToDashboard')}
        </Link>
      </div>
    </main>
  )
}
