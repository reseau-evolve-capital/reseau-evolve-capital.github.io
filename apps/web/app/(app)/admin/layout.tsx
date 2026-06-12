import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { getSessionUser, getAdminContext } from '@/lib/data/request'
import { Forbidden } from './Forbidden'
import { AdminTabs } from './AdminTabs'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta')
  return { title: t('title') }
}

// Garde par-club en défense (le middleware garde déjà la session + user_is_staff).
// Si l'utilisateur n'est trésorier+ dans aucun club → 403 propre, sans fuite d'info.
// Identité via getClaims() + contexte admin mémoïsés par requête (PARTAGÉS avec les
// pages admin — le middleware a déjà revalidé la session) : cf. lib/data/request.ts.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />

  return (
    <div className="flex flex-col gap-6">
      <AdminTabs />
      {children}
    </div>
  )
}
