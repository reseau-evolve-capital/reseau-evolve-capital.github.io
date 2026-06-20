import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { getClubSettings } from '@/lib/data/clubSettings'
import { getSessionUser, getAdminContext, getActiveClubMembership } from '@/lib/data/request'
import { SettingsView } from './SettingsView'
import { Forbidden } from '../Forbidden'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta')
  return { title: t('settingsTitle') }
}

export default async function AdminSettingsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  // Identité + contexte admin mémoïsés par requête (partagés avec le layout admin) ;
  // le middleware a déjà revalidé la session par getUser() réseau. Cf. lib/data/request.ts.
  const user = await getSessionUser()
  if (!user) return <Forbidden />

  // Garde par-club en défense (le middleware garde déjà la session + user_is_staff).
  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />

  const [settings, membership] = await Promise.all([
    getClubSettings(supabase, ctx.clubId),
    getActiveClubMembership(user.id),
  ])
  const currency = membership?.clubs?.currency ?? 'EUR'
  return <SettingsView initialSettings={settings} currency={currency} />
}
