import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { getContributionsData } from '@/lib/data/contributions'
import { getSessionUser, getActiveClubMembership } from '@/lib/data/request'
import { ContributionsView } from './ContributionsView'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('contributions')
  return { title: t('metaTitle') }
}

export default async function ContributionsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  // Identité via getClaims() (vérif locale du JWT, mémoïsée par requête) : le middleware
  // AUT-005 a DÉJÀ revalidé la session par getUser() réseau — cf. lib/data/request.ts.
  const user = await getSessionUser()
  if (!user) {
    // Le middleware AUT-005 protège déjà la route ; garde-fou défensif.
    return null
  }

  // Lookup memberships mémoïsé par requête — PARTAGÉ avec le layout (app) (ticket C).
  const m = await getActiveClubMembership(user.id)

  const initialData = m?.club_id ? await getContributionsData(supabase, user.id, m.club_id) : null

  // Largeur/padding gérés par le layout (app) ; le 2 colonnes desktop vit dans la vue.
  return <ContributionsView initialData={initialData} />
}
