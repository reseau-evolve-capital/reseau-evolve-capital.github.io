import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { resolveAdminContext, getClubMembers } from '@/lib/data/admin'
import { MembersView } from './MembersView'
import { Forbidden } from '../Forbidden'

export const metadata: Metadata = { title: 'Membres — Admin Evolve Capital' }

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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <MembersView initialData={{ clubId: ctx.clubId, members }} />
    </div>
  )
}
