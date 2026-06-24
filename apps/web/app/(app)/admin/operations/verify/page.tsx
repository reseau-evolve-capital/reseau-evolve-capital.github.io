import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import type { ClubVerifyData } from '@evolve/ui'
import {
  getClubMigrationVerify,
  getNetworkVerifyTargets,
  type MigrationMetricLabels,
  type VerifyTarget,
} from '@/lib/data/migrationVerify'
import {
  getSessionUser,
  getAdminContext,
  getActiveClubMembership,
  getNetworkContext,
} from '@/lib/data/request'
import { Forbidden } from '../../Forbidden'
import { MigrationVerifyView } from './MigrationVerifyView'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta')
  return { title: t('verificationTitle') }
}

// Écran utilitaire « Vérification migration » (OPS-106). La garde admin (trésorier+) est posée par
// le layout /admin (getAdminContext) ; on la re-vérifie ici en défense. Le périmètre dépend du rôle :
//   - trésorier → SON club (ctx.clubId) uniquement ;
//   - network admin → tous les clubs ACTIFS du réseau dont la matrice est branchée.
// Toutes les lectures passent par la RLS de la session (createServerClient) — jamais de service-role.
export default async function AdminOperationsVerifyPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />

  const t = await getTranslations('admin.operations.verification')
  const metricLabels: MigrationMetricLabels = {
    cash: t('metrics.cash'),
    contributions: t('metrics.contributions'),
    transactions: t('metrics.transactions'),
  }

  // Périmètre : un network admin compare tous les clubs branchés ; sinon le club du trésorier.
  const network = await getNetworkContext(user.id)
  let targets: VerifyTarget[]
  if (network?.role === 'network_admin') {
    targets = await getNetworkVerifyTargets(supabase)
    // Filet de sécurité : si le RPC réseau ne renvoie rien, on retombe sur le club actif.
    if (targets.length === 0) {
      const membership = await getActiveClubMembership(user.id)
      targets = [{ clubId: ctx.clubId, clubName: membership?.clubs?.name ?? t('thisClub') }]
    }
  } else {
    const membership = await getActiveClubMembership(user.id)
    targets = [{ clubId: ctx.clubId, clubName: membership?.clubs?.name ?? t('thisClub') }]
  }

  let clubs: ClubVerifyData[] = []
  let isError = false
  try {
    clubs = await Promise.all(
      targets.map((tgt) => getClubMigrationVerify(supabase, tgt.clubId, tgt.clubName, metricLabels))
    )
  } catch {
    // Erreur réseau/SQL → état d'erreur explicite côté UI (jamais de crash blanc).
    isError = true
  }

  return <MigrationVerifyView clubs={clubs} isError={isError} />
}
