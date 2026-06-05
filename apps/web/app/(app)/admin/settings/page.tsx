import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { resolveAdminContext } from '@/lib/data/admin'
import { getClubSettings } from '@/lib/data/clubSettings'
import { SettingsView } from './SettingsView'
import { Forbidden } from '../Forbidden'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta')
  return { title: t('settingsTitle') }
}

export default async function AdminSettingsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return <Forbidden />

  // Garde par-club en défense (le middleware garde déjà la session + user_is_staff).
  const ctx = await resolveAdminContext(supabase, user.id)
  if (!ctx) return <Forbidden />

  const settings = await getClubSettings(supabase, ctx.clubId)
  return <SettingsView initialSettings={settings} />
}
