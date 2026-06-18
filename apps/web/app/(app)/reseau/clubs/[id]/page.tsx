import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { getSessionUser, getNetworkContext } from '@/lib/data/request'
import { getNetworkClubDetail } from '@/lib/data/network'
import { Forbidden } from '../../Forbidden'
import { ClubDetailView } from './ClubDetailView'
import { getServiceAccountEmail, listSheetSnapshots, type SheetSnapshotEntry } from '../../actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reseau.clubDetail')
  return { title: t('meta.title') }
}

// Fiche club (NET-007). Garde réseau portée par le layout /reseau (Forbidden) + middleware ; on
// re-résout ici le rôle (admin vs board → actions sensibles conditionnelles) sans fuite d'info.
// Les RPC consommées (network_list_clubs, network_list_club_members, network_list_sheet_snapshots)
// sont elles-mêmes gardées côté DB. JAMAIS de service-role : tout passe par la RLS de la session.
export default async function ReseauClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getNetworkContext(user.id)
  if (!ctx) return <Forbidden />

  const detail = await getNetworkClubDetail(supabase, id)
  if (!detail) notFound()

  // Historique des syncs : best-effort (un échec de lecture ne doit pas casser la fiche entière).
  let snapshots: SheetSnapshotEntry[] = []
  const snapRes = await listSheetSnapshots(id)
  if (snapRes.ok) snapshots = snapRes.snapshots

  // Email du Service Account à partager (encart de l'étape « Changer la matrice »). `null` si non
  // configuré → l'UI affiche un fallback « — ». Server-only (dérivé d'une env d'affichage).
  const serviceAccountEmail = await getServiceAccountEmail()

  return (
    <ClubDetailView
      detail={detail}
      snapshots={snapshots}
      serviceAccountEmail={serviceAccountEmail}
      isAdmin={ctx.role === 'network_admin'}
    />
  )
}
