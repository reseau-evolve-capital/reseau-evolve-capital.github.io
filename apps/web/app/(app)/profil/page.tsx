import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { createServerClient } from '@evolve/data'
import { getProfileData } from '@/lib/data/profile'
import { getSessionUser } from '@/lib/data/request'
import { ProfileView } from './ProfileView'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('profile')
  return { title: t('metaTitle') }
}

export default async function ProfilPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  // Identité via getClaims() (vérif locale du JWT, mémoïsée par requête) : le middleware
  // (AUT-005 + guard onboarding A1) a DÉJÀ revalidé la session par getUser() réseau.
  const user = await getSessionUser()
  // Garde-fou défensif (le middleware protège déjà la route).
  if (!user) return null

  const data = await getProfileData(supabase, user.id)

  // Le layout (app) fournit padding + centrage + max-w-[1280px] : pas de wrapper ici.
  return <ProfileView data={data} />
}
