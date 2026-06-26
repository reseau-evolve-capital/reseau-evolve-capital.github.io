import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@evolve/ui'
import { getSessionUser, getAdminContext } from '@/lib/data/request'
import { Forbidden } from './Forbidden'
import { AdminTabs } from './AdminTabs'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta')
  return { title: t('title') }
}

// Garde par-club en défense (le middleware garde déjà la session + l'accès admin grossier).
// Si l'utilisateur ne peut voir l'admin d'aucun club → 403 propre, sans fuite d'info.
// Le secrétaire (LECTURE SEULE) est admis ici comme le staff ; `ctx.canManage=false` pour lui.
// Identité via getClaims() + contexte admin mémoïsés par requête (PARTAGÉS avec les
// pages admin — le middleware a déjà revalidé la session) : cf. lib/data/request.ts.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />

  const t = await getTranslations('admin')

  return (
    <div className="flex flex-col gap-6">
      {/* Bandeau LECTURE SEULE pour le secrétaire (décision owner : tous les onglets visibles,
          aucune action de gestion). Le staff ne le voit jamais. */}
      {!ctx.canManage && (
        <p
          role="status"
          className="inline-flex w-fit items-center gap-2 rounded-pill bg-card-sub px-3 py-1 text-[13px] font-medium text-text-sec"
        >
          <Icon name="Eye" size={16} aria-hidden="true" />
          {t('readOnlyBadge')}
        </p>
      )}
      <AdminTabs />
      {children}
    </div>
  )
}
