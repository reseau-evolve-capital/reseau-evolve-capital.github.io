import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { getSessionUser, getNetworkContext } from '@/lib/data/request'
import { getNetworkClubs } from '@/lib/data/network'
import { Forbidden } from '../Forbidden'
import { ClubsView } from './ClubsView'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reseau.clubs')
  return { title: t('meta.title') }
}

// Écran « Liste des clubs » (NET-005). La garde réseau est portée par le layout /reseau
// (Forbidden) + le middleware ; on re-vérifie ici en défense pour résoudre le rôle (admin vs
// board → bouton « Ajouter un club » conditionnel) sans fuite d'info. Identité + contexte réseau
// mémoïsés par requête (partagés avec le layout). Le RPC network_list_clubs() est lui-même gardé
// (is_network_member). JAMAIS de service-role : tout passe par la RLS de la session.
export default async function ReseauClubsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getNetworkContext(user.id)
  if (!ctx) return <Forbidden />

  const { clubs, kpis } = await getNetworkClubs(supabase)

  return <ClubsView initialData={{ clubs, kpis }} isAdmin={ctx.role === 'network_admin'} />
}
