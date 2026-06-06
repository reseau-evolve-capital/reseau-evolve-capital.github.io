import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@evolve/data'
import { SuspendedScreenClient } from './SuspendedScreenClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('accessSuspended')
  return { title: t('metaTitle') }
}

export default async function AccessSuspendedPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Ne montrer cet écran qu'aux membres réellement bloqués (sinon retour au dashboard).
  const { data: blocked } = await supabase.rpc('current_user_access_blocked')
  if (!blocked) redirect('/dashboard')

  // Email du trésorier d'un club du membre — RLS « memberships/users: club read » s'applique
  // (l'adhésion reste is_active : seul access_status passe à 'locked').
  const { data: staff } = await supabase
    .from('memberships')
    .select('users!memberships_user_id_fkey!inner(email)')
    .in('role', ['treasurer', 'president'])
    .limit(1)
    .maybeSingle<{ users: { email: string } }>()

  const treasurerMailto = staff?.users.email ? `mailto:${staff.users.email}` : undefined
  return <SuspendedScreenClient treasurerMailto={treasurerMailto} />
}
