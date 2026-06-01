import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { resolveAdminContext, getClubSummary } from '@/lib/data/admin'
import { AdminDashboardView } from './AdminDashboardView'
import { Forbidden } from './Forbidden'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return <Forbidden />

  const ctx = await resolveAdminContext(supabase, user.id)
  if (!ctx) return <Forbidden />

  const summary = await getClubSummary(supabase, ctx.clubId, ctx.role)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <AdminDashboardView initialData={summary} />
    </div>
  )
}
