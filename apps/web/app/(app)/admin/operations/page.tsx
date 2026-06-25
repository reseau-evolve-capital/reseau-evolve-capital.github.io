import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient, getClubCashBalance, listRecentOperations } from '@evolve/data'
import { getSessionUser, getAdminContext } from '@/lib/data/request'
import { toListItem } from '@/lib/data/operations'
import { OperationsDashboardView } from './OperationsDashboardView'
import { Forbidden } from '../Forbidden'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta')
  return { title: t('operationsTitle') }
}

// P0-a — Tableau de bord Opérations (E-OPS-2 §3). Garde staff (trésorier+ du club actif) en
// défense (le layout /admin garde déjà). Lit le solde espèces + les 6 dernières opérations.
// Toutes les lectures passent par la RLS de la session — jamais de service-role.
export default async function AdminOperationsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />

  const [balance, recent] = await Promise.all([
    getClubCashBalance(supabase, ctx.clubId),
    listRecentOperations(supabase, ctx.clubId, 6),
  ])

  return <OperationsDashboardView balance={balance} recentOperations={recent.map(toListItem)} />
}
