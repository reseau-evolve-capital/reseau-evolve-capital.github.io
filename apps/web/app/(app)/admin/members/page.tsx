import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { resolveAdminContext, getClubMembers } from '@/lib/data/admin'
import { MembersView } from './MembersView'
import { Forbidden } from '../Forbidden'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta')
  return { title: t('membersTitle') }
}

export default async function AdminMembersPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return <Forbidden />

  const ctx = await resolveAdminContext(supabase, user.id)
  if (!ctx) return <Forbidden />

  const members = await getClubMembers(supabase, ctx.clubId)

  return <MembersView initialData={{ clubId: ctx.clubId, members }} />
}
