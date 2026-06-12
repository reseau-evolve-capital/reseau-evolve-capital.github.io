import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { getClubSummary } from '@/lib/data/admin'
import { getSessionUser, getAdminContext } from '@/lib/data/request'
import { AdminDashboardView } from './AdminDashboardView'
import { Forbidden } from './Forbidden'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  // Identité + contexte admin mémoïsés par requête (partagés avec le layout admin) ;
  // le middleware a déjà revalidé la session par getUser() réseau. Cf. lib/data/request.ts.
  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />

  const summary = await getClubSummary(supabase, ctx.clubId, ctx.role)

  return <AdminDashboardView initialData={summary} />
}
