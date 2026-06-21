import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { getSessionUser, getAdminContext } from '@/lib/data/request'
import { getClubFeedback } from '@/lib/data/feedback'
import { Forbidden } from '../Forbidden'
import { FeedbackConsoleView, type FeedbackPeriod } from '../../reseau/retours/FeedbackConsoleView'
import { updateClubFeedbackStatusAction } from './actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.retours')
  return { title: t('meta.title') }
}

/** Borne ISO de début de période (created_at >= since). `all` → null. */
function sinceFor(period: FeedbackPeriod): string | null {
  if (period === 'all') return null
  const days = period === '30d' ? 30 : 90
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function parsePeriod(raw: string | string[] | undefined): FeedbackPeriod {
  const v = Array.isArray(raw) ? raw[0] : raw
  return v === '90d' || v === 'all' ? v : '30d'
}

// Console feedbacks BUREAU DE CLUB (ADM-009). Le layout /admin garde déjà la session + staff (any
// club) ; on re-vérifie ici le contexte admin scopé au club ACTIF (Forbidden si simple membre du
// club actif). La lecture passe par la RLS « staff lit son club » (migration 051) + filtre serveur
// au club actif — JAMAIS de service-role. Période par défaut : 30 jours. Réutilise le composant
// partagé de NET-019 en scope='club' (pas de filtre/colonne Club ; dataviz « Volume par semaine »).
export default async function AdminRetoursPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string | string[] }>
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />

  const period = parsePeriod((await searchParams).periode)
  const data = await getClubFeedback(supabase, ctx.clubId, sinceFor(period))
  const t = await getTranslations('admin.retours')

  return (
    <FeedbackConsoleView
      scope="club"
      initialData={data}
      period={period}
      title={t('title')}
      subtitle={t('subtitle')}
      basePath="/admin/retours"
      updateStatusAction={updateClubFeedbackStatusAction}
    />
  )
}
