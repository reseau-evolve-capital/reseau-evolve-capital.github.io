import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { EmptyState } from '@evolve/ui'
import { getSessionUser, getAdminContext } from '@/lib/data/request'
import { Forbidden } from '../../Forbidden'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.operations.settlement')
  return { title: t('comingSoonTitle') }
}

// Placeholder « Traiter maintenant » (settlement = distribution de parts) — hors périmètre
// E-OPS-2 (livré en E-OPS-4). Garde staff conservée ; l'écran annonce simplement l'arrivée.
export default async function AdminOperationsSettlementPage() {
  const user = await getSessionUser()
  if (!user) return <Forbidden />
  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />

  const t = await getTranslations('admin.operations.settlement')

  return (
    <div className="mx-auto w-full max-w-[640px] pt-10">
      <EmptyState icon="Coins" title={t('comingSoonTitle')} description={t('comingSoonText')} />
    </div>
  )
}
