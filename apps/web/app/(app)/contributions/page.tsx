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

  // Libellés de cellule i18n (tooltips + aria) résolus côté RSC : la couche data reste pure,
  // elle ne fait qu'appeler ces fonctions. Défauts FR internes si jamais l'objet manque (tests).
  // NB : on passe par le namespace `contributions` + chemin `timeline.cell.*` (next-intl ne type
  // pas un sous-objet à params ICU comme namespace direct).
  const t = await getTranslations('contributions')
  const cellLabels = {
    paid: (v: { month: string; amount: string; date: string }) => t('timeline.cell.paid', v),
    paidNoDate: (v: { month: string; amount: string }) => t('timeline.cell.paidNoDate', v),
    pending: (v: { month: string }) => t('timeline.cell.pending', v),
    late: (v: { month: string; amount: string }) => t('timeline.cell.late', v),
    lateNoAmount: (v: { month: string }) => t('timeline.cell.lateNoAmount', v),
    future: (v: { month: string }) => t('timeline.cell.future', v),
    notApplicable: (v: { month: string }) => t('timeline.cell.notApplicable', v),
    paidAria: (v: { month: string; amount: string; date: string }) =>
      t('timeline.cell.paidAria', v),
    paidNoDateAria: (v: { month: string; amount: string }) => t('timeline.cell.paidNoDateAria', v),
    pendingAria: (v: { month: string }) => t('timeline.cell.pendingAria', v),
    lateAria: (v: { month: string; amount: string }) => t('timeline.cell.lateAria', v),
    futureAria: (v: { month: string }) => t('timeline.cell.futureAria', v),
    notApplicableAria: (v: { month: string }) => t('timeline.cell.notApplicableAria', v),
  }

  const initialData = m?.club_id
    ? await getContributionsData(supabase, user.id, m.club_id, cellLabels)
    : null

  // Largeur/padding gérés par le layout (app) ; le 2 colonnes desktop vit dans la vue.
  return <ContributionsView initialData={initialData} />
}
