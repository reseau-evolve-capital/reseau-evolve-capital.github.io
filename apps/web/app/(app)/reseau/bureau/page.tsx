import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { getSessionUser, getNetworkContext } from '@/lib/data/request'
import { getNetworkBoardPayload } from '@/lib/data/network'
import { Forbidden } from '../Forbidden'
import { BureauView } from './BureauView'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reseau.bureau')
  return { title: t('meta.title') }
}

// Écran « Bureau du réseau » (NET-020). Gestion des rôles RÉSEAU (attribution / retrait) branchée
// sur les RPC d'écriture (migration 042, gardées is_network_admin). La garde réseau est portée par
// le layout /reseau (Forbidden) + le middleware ; on re-vérifie ici en défense pour résoudre le rôle
// (admin → actions ; board → LECTURE SEULE). Les lectures passent par RPC gardées is_network_member
// (migration 055). JAMAIS de service-role : tout passe par la RLS / les gardes RPC de la session.
export default async function ReseauBureauPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getNetworkContext(user.id)
  if (!ctx) return <Forbidden />

  const { board, eligible } = await getNetworkBoardPayload(supabase)

  return (
    <BureauView
      initialData={{ board, eligible }}
      isAdmin={ctx.role === 'network_admin'}
      currentUserId={user.id}
    />
  )
}
