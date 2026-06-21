import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { getClubMembers } from '@/lib/data/admin'
import { getSessionUser, getAdminContext } from '@/lib/data/request'
import { MembersView } from './MembersView'
import { Forbidden } from '../Forbidden'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta')
  return { title: t('membersTitle') }
}

export default async function AdminMembersPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  // Identité + contexte admin mémoïsés par requête (partagés avec le layout admin) ;
  // le middleware a déjà revalidé la session par getUser() réseau. Cf. lib/data/request.ts.
  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />

  const members = await getClubMembers(supabase, ctx.clubId)

  // Rôle de l'utilisateur courant dans le club : pilote l'anti-escalade côté UI (un trésorier ne
  // voit pas l'option « Président » dans l'éditeur de rôle). La règle est aussi appliquée côté RPC.
  return <MembersView initialData={{ clubId: ctx.clubId, members }} currentUserRole={ctx.role} />
}
