import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { getSessionUser, getNetworkContext } from '@/lib/data/request'
import { getNetworkFeedback } from '@/lib/data/feedback'
import { Forbidden } from '../Forbidden'
import { FeedbackConsoleView, type FeedbackPeriod } from './FeedbackConsoleView'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reseau.retours')
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

// Console feedbacks RÉSEAU (NET-019). Garde réseau portée par le layout /reseau (Forbidden) +
// middleware ; on re-vérifie ici en défense. La lecture passe par la RLS « membre réseau lit tout »
// (migration 051) — JAMAIS de service-role. Période par défaut : 30 jours.
export default async function ReseauRetoursPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string | string[] }>
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getNetworkContext(user.id)
  if (!ctx) return <Forbidden />

  const period = parsePeriod((await searchParams).periode)
  const data = await getNetworkFeedback(supabase, sinceFor(period))

  return <FeedbackConsoleView initialData={data} period={period} />
}
