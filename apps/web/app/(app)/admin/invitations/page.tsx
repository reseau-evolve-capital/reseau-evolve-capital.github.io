import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { resolveAdminContext } from '@/lib/data/admin'
import { listClubInvitations } from '@/lib/data/invitations'
import { InvitationsView } from './InvitationsView'
import { Forbidden } from '../Forbidden'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta')
  return { title: t('invitationsTitle') }
}

export default async function AdminInvitationsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return <Forbidden />

  const ctx = await resolveAdminContext(supabase, user.id)
  if (!ctx) return <Forbidden />

  const invitations = await listClubInvitations(supabase, ctx.clubId)
  return <InvitationsView initialData={{ clubId: ctx.clubId, invitations }} />
}
