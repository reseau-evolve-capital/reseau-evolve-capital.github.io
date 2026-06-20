import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { getPortfolioData } from '@/lib/data/portfolio'
import { getSessionUser, getActiveClubMembership } from '@/lib/data/request'
import { PortfolioView } from './PortfolioView'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('portfolio')
  return { title: t('metaTitle') }
}

export default async function PortfolioPage() {
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

  const initialData = m?.club_id ? await getPortfolioData(supabase, user.id, m.club_id) : null

  const currency = m?.clubs?.currency ?? 'EUR'

  // Le layout (app) fournit déjà padding + centrage + max-w-[1280px] ; pas de wrapper
  // supplémentaire qui briderait la grille 3 colonnes desktop du PortfolioView.
  return <PortfolioView initialData={initialData} currency={currency} />
}
