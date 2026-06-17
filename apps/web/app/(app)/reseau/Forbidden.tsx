'use client'

// État 403 de l'espace RÉSEAU. Réutilise EmptyState (a11y déjà couverte) — pas de nouveau
// composant packages/ui. Ne révèle aucune info sensible (message générique).
// Calque de admin/Forbidden, namespace i18n `reseau.forbidden.*`.
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { EmptyState } from '@evolve/ui'

export function Forbidden() {
  const router = useRouter()
  const t = useTranslations('reseau')
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <EmptyState
        icon="Lock"
        title={t('forbidden.title')}
        description={t('forbidden.description')}
        action={{ label: t('forbidden.action'), onClick: () => router.push('/dashboard') }}
      />
    </div>
  )
}
