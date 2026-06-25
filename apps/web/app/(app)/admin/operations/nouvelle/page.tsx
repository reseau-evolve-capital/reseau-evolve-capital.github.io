import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { createServerClient, getClubCashBalance } from '@evolve/data'
import type { OperationTypeKey } from '@evolve/ui'
import { getSessionUser, getAdminContext } from '@/lib/data/request'
import {
  getActiveClubMemberOptions,
  getClubMinContribution,
  type ActiveMemberOption,
} from '@/lib/data/operations'
import { NewOperationView } from './NewOperationView'
import { Forbidden } from '../../Forbidden'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta')
  return { title: t('newOperationTitle') }
}

/** Types pré-sélectionnables via `?type=` (sinon l'assistant démarre à l'étape 1). */
const VALID_TYPES: readonly OperationTypeKey[] = [
  'contribution',
  'buy',
  'sell',
  'dividend_cash',
  'fee',
  'penalty',
]

function parseInitialType(raw: string | string[] | undefined): OperationTypeKey | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw
  return VALID_TYPES.includes(value as OperationTypeKey) ? (value as OperationTypeKey) : undefined
}

// P0-b — Nouvelle opération (assistant 3 étapes, E-OPS-2 §4). Garde staff en défense. Charge la
// liste des membres actifs (select), la cotisation minimale (hint) et le solde courant (étape 3).
export default async function AdminNewOperationPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />

  const [members, minContribution, balance, params] = await Promise.all([
    getActiveClubMemberOptions(supabase, ctx.clubId),
    getClubMinContribution(supabase, ctx.clubId),
    getClubCashBalance(supabase, ctx.clubId),
    searchParams,
  ])
  const initialType = parseInitialType(params.type)

  return (
    <NewOperationView
      members={members as ActiveMemberOption[]}
      minContribution={minContribution}
      balanceBefore={balance}
      initialType={initialType}
    />
  )
}
