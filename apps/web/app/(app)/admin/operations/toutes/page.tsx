import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import {
  createServerClient,
  listOperations,
  type OperationType,
  type ListOperationsOptions,
} from '@evolve/data'
import { getSessionUser, getAdminContext } from '@/lib/data/request'
import { toDetail, toListItem, getActiveClubMemberOptions } from '@/lib/data/operations'
import { OperationsListView, PERIOD_PRESETS, type PeriodKey } from './OperationsListView'
import { Forbidden } from '../../Forbidden'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta')
  return { title: t('operationsAllTitle') }
}

const PAGE_SIZE = 25

/** Types valides pour le filtre `?type=` (CHECK operations.type). */
const VALID_FILTER_TYPES: readonly OperationType[] = [
  'contribution',
  'member_exit',
  'buy',
  'sell',
  'dividend_cash',
  'dividend_stock',
  'fee',
  'penalty',
  'capital_call',
  'distribution',
  'valuation',
  'correction',
]

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

/** Borne basse ISO (YYYY-MM-DD) il y a `months` mois, ou undefined pour « tout ». */
function periodFrom(months: number | null): string | undefined {
  if (months == null) return undefined
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

// OPS-205 — Toutes les opérations (liste + détail + annulation, E-OPS-2 §5). Garde staff en
// défense. Filtres (type / membre / période) + pagination via searchParams. Lectures RLS session.
export default async function AdminOperationsAllPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string
    membre?: string
    periode?: string
    page?: string
  }>
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />

  const params = await searchParams
  const typeParam = first(params.type)
  const type = VALID_FILTER_TYPES.includes(typeParam as OperationType)
    ? (typeParam as OperationType)
    : undefined
  const pageNum = Math.max(1, Number.parseInt(first(params.page) ?? '1', 10) || 1)

  // Période : preset validé (défaut « 6 derniers mois »).
  const periodParam = first(params.periode)
  const period: PeriodKey =
    periodParam && periodParam in PERIOD_PRESETS ? (periodParam as PeriodKey) : '6m'
  const from = periodFrom(PERIOD_PRESETS[period])

  // Membre : on charge les membres actifs (select du chip Membre) et on valide le param contre eux.
  const memberOptions = await getActiveClubMemberOptions(supabase, ctx.clubId)
  const membreParam = first(params.membre) || null
  const membershipId = memberOptions.some((m) => m.id === membreParam) ? membreParam : null

  const opts: ListOperationsOptions = {
    types: type ? [type] : undefined,
    membershipId,
    from,
    // +1 pour détecter s'il existe une page suivante (hasMore).
    limit: PAGE_SIZE + 1,
    offset: (pageNum - 1) * PAGE_SIZE,
  }

  const rows = await listOperations(supabase, ctx.clubId, opts)
  const hasMore = rows.length > PAGE_SIZE
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows

  return (
    <OperationsListView
      operations={page.map(toListItem)}
      details={page.map(toDetail)}
      hasMore={hasMore}
      page={pageNum}
      activeType={type ?? null}
      members={memberOptions}
      activeMembershipId={membershipId}
      activePeriod={period}
    />
  )
}
