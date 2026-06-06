// Couche data du module cotisations (COT-004).
//
// Deux sources, isolées par RLS « own read » (auth.uid()) :
//   - `contributions`        : synthèse par membre (months_count, detention_pct, total_contributed,
//                              penalties, status, amount_due). 1 ligne par membership.
//   - `contribution_months`  : historique mensuel (year, month, amount, status, paid_at).
//
// Les fonctions de mapping/agrégation sont PURES (testées sans DB). Mois futurs : absents en DB
// → non rendus. JAMAIS de service-role ici (chemin membre).
//
// Réf : E-COT, écran 04_contributions.md, DATA_MODEL.md §2.6/§2.7, CLAUDE.md (RLS, formatage @evolve/utils).

import type { createServerClient, Database } from '@evolve/data'
import type { TimelineYear, CotisationVariant } from '@evolve/ui'
import { formatEUR, formatMonth, formatDate } from '@evolve/utils'

type ServerClient = ReturnType<typeof createServerClient>
type ContributionRow = Database['public']['Tables']['contributions']['Row']
type ContributionMonthRow = Database['public']['Tables']['contribution_months']['Row']

export type ContributionStatus = Database['public']['Enums']['contribution_status']
export type MonthStatus = Database['public']['Enums']['month_status']
export type MemberRole = Database['public']['Enums']['member_role']

/** Donnée mensuelle brute consommée par les mappers (sous-ensemble de la Row). */
export interface MonthInput {
  year: number
  month: number
  amount: number
  status: MonthStatus
  paidAt: string | null
}

export interface ContributionsData {
  clubId: string
  status: ContributionStatus
  userRole: MemberRole
  totalContributed: number
  monthsCount: number
  /** Valeur boursière nette détenue par le membre (€). null si non renseignée. */
  netMarketValue: number | null
  detentionPct: number // fraction 0..1 (formatPct l'attend ainsi)
  penalties: number
  amountDue: number
  syncedAt: string | null
  years: TimelineYear[]
}

/** Mapping statut mensuel DB → variante visuelle CotisationMonth. */
const MONTH_VARIANT: Record<MonthStatus, CotisationVariant> = {
  paid: 'paid',
  due: 'pending',
  late: 'late',
  exempt: 'exempt',
}

export function monthVariant(status: MonthStatus): CotisationVariant {
  return MONTH_VARIANT[status]
}

/** Capitalise la 1re lettre (formatMonth renvoie « mars 2025 » en minuscule). */
function cap(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1)
}

/** « Mars 2025 » à partir de (2025, 3). */
function monthLabel(year: number, month: number): string {
  return cap(formatMonth(new Date(year, month - 1, 1)))
}

/** Contenu riche du Popover : « Mars 2025 — payé 100 € le 15/03/2025 ». */
export function buildMonthTooltip(m: MonthInput): string {
  const label = monthLabel(m.year, m.month)
  switch (m.status) {
    case 'paid':
      return m.paidAt
        ? `${label} — payé ${formatEUR(m.amount)} le ${formatDate(m.paidAt)}`
        : `${label} — payé ${formatEUR(m.amount)}`
    case 'late':
      return `${label} — en retard${m.amount > 0 ? ` — ${formatEUR(m.amount)} dus` : ''}`
    case 'exempt':
      return `${label} — exempté`
    case 'due':
    default:
      return `${label} — en attente`
  }
}

/** Libellé lecteur d'écran (verbeux, AAA sur les chiffres). */
export function buildMonthAriaLabel(m: MonthInput): string {
  const label = monthLabel(m.year, m.month)
  switch (m.status) {
    case 'paid':
      return `${label}, payé ${formatEUR(m.amount)}`
    case 'late':
      return `${label}, en retard${m.amount > 0 ? `, ${formatEUR(m.amount)} dus` : ''}`
    case 'exempt':
      return `${label}, exempté`
    case 'due':
    default:
      return `${label}, en attente`
  }
}

/** Groupe les mois par année (années DESC, mois DESC au sein de chaque année). */
export function buildTimelineYears(months: MonthInput[]): TimelineYear[] {
  const byYear = new Map<number, MonthInput[]>()
  for (const m of months) {
    const list = byYear.get(m.year) ?? []
    list.push(m)
    byYear.set(m.year, list)
  }
  return [...byYear.keys()]
    .sort((a, b) => b - a)
    .map((year) => ({
      year,
      months: byYear
        .get(year)!
        .sort((a, b) => b.month - a.month)
        .map((m) => ({
          month: m.month,
          variant: monthVariant(m.status),
          tooltip: buildMonthTooltip(m),
          ariaLabel: buildMonthAriaLabel(m),
        })),
    }))
}

/** Charge les données cotisations du membre courant. RLS isole par auth.uid().
 *  Retourne null si aucune ligne `contributions` (état empty).
 *
 *  On résout d'abord le `membership_id` du membre courant : la table `contributions`
 *  porte un index par `membership_id` et RLS expose TOUTES les lignes du club au
 *  trésorier → filtrer par `club_id` seul renverrait plusieurs lignes et ferait
 *  exploser `.maybeSingle()`. Cibler le `membership_id` garantit exactement 1 ligne
 *  quel que soit le rôle (membre ou trésorier). */
export async function getContributionsData(
  supabase: ServerClient,
  userId: string,
  clubId: string
): Promise<ContributionsData | null> {
  // Fix 1 — résoudre l'adhésion du membre courant pour un filtre précis (role-safe).
  const { data: membership } = await supabase
    .from('memberships')
    .select('id, role')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle<{ id: string; role: MemberRole }>()
  if (!membership) return null
  const membershipId = membership.id

  // D3 — l'échéancier de la matrice va jusqu'en 2051 (mois `due` à venir) ; on borne la
  // frise à l'année COURANTE pour ne pas afficher des décennies de mois futurs vides.
  const currentYear = new Date().getFullYear()

  // Fix 2 — paralléliser les deux requêtes data (indépendantes, cf. dashboard.ts).
  const [{ data: summary, error }, { data: monthRows, error: monthsError }] = await Promise.all([
    supabase
      .from('contributions')
      // D1 — net_market_value : valeur boursière nette du membre (déjà en DB, jamais lue).
      .select(
        'status, total_contributed, months_count, net_market_value, detention_pct, penalties, amount_due, synced_at'
      )
      .eq('membership_id', membershipId)
      .maybeSingle<
        Pick<
          ContributionRow,
          | 'status'
          | 'total_contributed'
          | 'months_count'
          | 'net_market_value'
          | 'detention_pct'
          | 'penalties'
          | 'amount_due'
          | 'synced_at'
        >
      >(),
    supabase
      .from('contribution_months')
      .select('year, month, amount, status, paid_at')
      .eq('membership_id', membershipId)
      .lte('year', currentYear)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .returns<Pick<ContributionMonthRow, 'year' | 'month' | 'amount' | 'status' | 'paid_at'>[]>(),
  ])
  if (error) throw error
  if (monthsError) throw monthsError
  if (!summary) return null

  const months: MonthInput[] = (monthRows ?? []).map((r) => ({
    year: r.year,
    month: r.month,
    amount: Number(r.amount ?? 0),
    status: r.status,
    paidAt: r.paid_at,
  }))

  return {
    clubId,
    status: summary.status,
    userRole: membership.role,
    totalContributed: Number(summary.total_contributed ?? 0),
    // D2 — la colonne `months_count` vient d'une cellule #ERROR! (→ null/0). On dérive le
    // compte RÉEL des mois cotisés depuis l'historique chargé (statut `paid`), cohérent
    // avec la frise. NB : `months` est déjà borné à l'année courante (filtre .lte ci-dessus).
    monthsCount: months.filter((m) => m.status === 'paid').length,
    netMarketValue: summary.net_market_value != null ? Number(summary.net_market_value) : null,
    detentionPct: Number(summary.detention_pct ?? 0),
    penalties: Number(summary.penalties ?? 0),
    amountDue: Number(summary.amount_due ?? 0),
    syncedAt: summary.synced_at ?? null,
    years: buildTimelineYears(months),
  }
}
