import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { createServerClient } from '@evolve/data'
import { getProfileData } from '@/lib/data/profile'
import { ProfileView } from './ProfileView'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('profile')
  return { title: t('metaTitle') }
}

export default async function ProfilPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Le middleware (AUT-005 + guard onboarding A1) protège déjà la route ; garde-fou défensif.
  if (!user) return null

  const data = await getProfileData(supabase, user.id)

  // Le layout (app) fournit padding + centrage + max-w-[1280px] : pas de wrapper ici.
  return <ProfileView data={data} />
}
