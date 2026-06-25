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
import { toDetail, toListItem } from '@/lib/data/operations'
import { OperationsListView } from './OperationsListView'
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

// OPS-205 — Toutes les opérations (liste + détail + annulation, E-OPS-2 §5). Garde staff en
// défense. Filtres (type / membre / période) + pagination via searchParams. Lectures RLS session.
export default async function AdminOperationsAllPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string
    membre?: string
    from?: string
    to?: string
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
  const membershipId = first(params.membre) || null
  const pageNum = Math.max(1, Number.parseInt(first(params.page) ?? '1', 10) || 1)

  const opts: ListOperationsOptions = {
    types: type ? [type] : undefined,
    membershipId,
    from: first(params.from),
    to: first(params.to),
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
    />
  )
}
