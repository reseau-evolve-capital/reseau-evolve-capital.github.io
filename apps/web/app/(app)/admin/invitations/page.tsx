import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { listClubInvitations } from '@/lib/data/invitations'
import { getSessionUser, getAdminContext } from '@/lib/data/request'
import { InvitationsView } from './InvitationsView'
import { Forbidden } from '../Forbidden'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta')
  return { title: t('invitationsTitle') }
}

export default async function AdminInvitationsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  // Identité + contexte admin mémoïsés par requête (partagés avec le layout admin) ;
  // le middleware a déjà revalidé la session par getUser() réseau. Cf. lib/data/request.ts.
  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />

  const invitations = await listClubInvitations(supabase, ctx.clubId)
  return (
    <InvitationsView initialData={{ clubId: ctx.clubId, invitations }} canManage={ctx.canManage} />
  )
}
