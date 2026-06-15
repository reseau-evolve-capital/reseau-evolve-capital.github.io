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

import { deriveContributionStatus, deriveAmountDue, joinedAtToYM } from './contributionStatus'

type ServerClient = ReturnType<typeof createServerClient>
type ContributionRow = Database['public']['Tables']['contributions']['Row']
type ContributionMonthRow = Database['public']['Tables']['contribution_months']['Row']
type ClubRow = Database['public']['Tables']['clubs']['Row']

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

/** Indice ordinal absolu d'un mois (year*12 + month-1) pour comparer < / > facilement. */
function toYM(year: number, month: number): number {
  return year * 12 + (month - 1)
}

/** Dérive la variante visuelle d'une cellule à partir de son statut DB ET du CONTEXTE
 *  (adhésion + mois courant) :
 *   - mois antérieur à l'adhésion → `not_applicable` (jamais `late`/rouge : c'était LE bug) ;
 *   - mois strictement futur (année courante) → `future` (anneau pointillé, pas `pending`) ;
 *   - sinon : paid→paid, late→late, due→pending, exempt→not_applicable
 *     (exempt traité comme « sans objet » — il ne doit plus jamais apparaître).
 *  `joinedAtYM`/`nowYM` sont des indices ordinaux (cf. toYM). */
export function deriveVariant(
  m: MonthInput,
  joinedAtYM: number | null,
  nowYM: number
): CotisationVariant {
  const ym = toYM(m.year, m.month)
  if (joinedAtYM != null && ym < joinedAtYM) return 'not_applicable'
  if (ym > nowYM) return 'future'
  switch (m.status) {
    case 'paid':
      return 'paid'
    case 'late':
      return 'late'
    case 'due':
      return 'pending'
    case 'exempt':
    default:
      return 'not_applicable'
  }
}

/** Capitalise la 1re lettre (formatMonth renvoie « mars 2025 » en minuscule). */
function cap(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1)
}

/** « Mars 2025 » à partir de (2025, 3). Dette : formatMonth est figé fr-FR (mois EN non traduits). */
function monthLabel(year: number, month: number): string {
  return cap(formatMonth(new Date(year, month - 1, 1)))
}

/** Libellés de cellule i18n. Chaque entrée reçoit les valeurs déjà formatées
 *  (month/amount/date) et rend la chaîne finale. Fournis par page.tsx (RSC) via next-intl ;
 *  les DÉFAUTS internes sont FR byte-exacts (tests purs sans i18n). */
export interface CellLabels {
  paid: (v: { month: string; amount: string; date: string }) => string
  paidNoDate: (v: { month: string; amount: string }) => string
  pending: (v: { month: string }) => string
  late: (v: { month: string; amount: string }) => string
  lateNoAmount: (v: { month: string }) => string
  future: (v: { month: string }) => string
  notApplicable: (v: { month: string }) => string
  paidAria: (v: { month: string; amount: string; date: string }) => string
  paidNoDateAria: (v: { month: string; amount: string }) => string
  pendingAria: (v: { month: string }) => string
  lateAria: (v: { month: string; amount: string }) => string
  futureAria: (v: { month: string }) => string
  notApplicableAria: (v: { month: string }) => string
}

/** Défauts FR (byte-exacts avec apps/web/messages/fr.json → contributions.timeline.cell). */
const DEFAULT_CELL_LABELS: CellLabels = {
  paid: ({ month, amount, date }) => `${month} : ${amount} payés le ${date}.`,
  paidNoDate: ({ month, amount }) => `${month} : ${amount} payés.`,
  pending: ({ month }) => `${month} : cotisation en cours ce mois-ci.`,
  late: ({ month, amount }) => `${month} : ${amount} à régler.`,
  lateNoAmount: ({ month }) => `${month} : cotisation à régler.`,
  future: ({ month }) => `${month} : à venir.`,
  notApplicable: ({ month }) => `${month} : avant ton arrivée dans le club.`,
  paidAria: ({ month, amount, date }) => `Cotisation de ${month} : ${amount} payés le ${date}.`,
  paidNoDateAria: ({ month, amount }) =>
    `Cotisation de ${month} : ${amount} payés, date non renseignée.`,
  pendingAria: ({ month }) => `Cotisation de ${month} : en cours, c'est le mois en cours.`,
  lateAria: ({ month, amount }) => `Cotisation de ${month} : ${amount} en retard, à régler.`,
  futureAria: ({ month }) => `Cotisation de ${month} : à venir, pas encore due.`,
  notApplicableAria: ({ month }) =>
    `${month} : hors de ta période d'adhésion, avant ton arrivée dans le club.`,
}

/** Contenu riche du Popover, piloté par la VARIANTE dérivée (pas le statut DB brut). */
export function buildMonthTooltip(
  m: MonthInput,
  variant: CotisationVariant,
  labels: CellLabels = DEFAULT_CELL_LABELS
): string {
  const month = monthLabel(m.year, m.month)
  switch (variant) {
    case 'paid':
      return m.paidAt
        ? labels.paid({ month, amount: formatEUR(m.amount), date: formatDate(m.paidAt) })
        : labels.paidNoDate({ month, amount: formatEUR(m.amount) })
    case 'late':
      return m.amount > 0
        ? labels.late({ month, amount: formatEUR(m.amount) })
        : labels.lateNoAmount({ month })
    case 'future':
      return labels.future({ month })
    case 'not_applicable':
      return labels.notApplicable({ month })
    case 'pending':
    default:
      return labels.pending({ month })
  }
}

/** Libellé lecteur d'écran (verbeux, AAA sur les chiffres), piloté par la variante dérivée. */
export function buildMonthAriaLabel(
  m: MonthInput,
  variant: CotisationVariant,
  labels: CellLabels = DEFAULT_CELL_LABELS
): string {
  const month = monthLabel(m.year, m.month)
  switch (variant) {
    case 'paid':
      return m.paidAt
        ? labels.paidAria({ month, amount: formatEUR(m.amount), date: formatDate(m.paidAt) })
        : labels.paidNoDateAria({ month, amount: formatEUR(m.amount) })
    case 'late':
      return labels.lateAria({ month, amount: formatEUR(m.amount) })
    case 'future':
      return labels.futureAria({ month })
    case 'not_applicable':
      return labels.notApplicableAria({ month })
    case 'pending':
    default:
      return labels.pendingAria({ month })
  }
}

/** Groupe les mois par année (années DESC, mois DESC au sein de chaque année).
 *  La variante de chaque cellule est dérivée CONTEXTUELLEMENT (adhésion + mois courant). */
export function buildTimelineYears(
  months: MonthInput[],
  joinedAtYM: number | null,
  nowYM: number,
  labels: CellLabels = DEFAULT_CELL_LABELS
): TimelineYear[] {
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
        .map((m) => {
          const variant = deriveVariant(m, joinedAtYM, nowYM)
          return {
            month: m.month,
            variant,
            tooltip: buildMonthTooltip(m, variant, labels),
            ariaLabel: buildMonthAriaLabel(m, variant, labels),
          }
        }),
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
  clubId: string,
  cellLabels?: CellLabels
): Promise<ContributionsData | null> {
  // Fix 1 — résoudre l'adhésion du membre courant pour un filtre précis (role-safe).
  // `joined_at` borne les mois ANTÉRIEURS à l'adhésion → `not_applicable` (jamais rouge).
  const { data: membership } = await supabase
    .from('memberships')
    .select('id, role, joined_at')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle<{ id: string; role: MemberRole; joined_at: string | null }>()
  if (!membership) return null
  const membershipId = membership.id

  // D3 — l'échéancier de la matrice va jusqu'en 2051 (mois `due` à venir) ; on borne la
  // frise à l'année COURANTE pour ne pas afficher des décennies de mois futurs vides.
  const now = new Date()
  const currentYear = now.getFullYear()
  // Indices ordinaux pour la dérivation contextuelle des variantes (cf. deriveVariant).
  const nowYM = currentYear * 12 + now.getMonth()
  const joinedAtYM = joinedAtToYM(membership.joined_at)

  // Fix 2 — paralléliser les requêtes data indépendantes (cf. dashboard.ts).
  // RT-05 — on lit aussi `clubs.min_contribution` : sert de base au calcul du montant dû dérivé
  // quand la colonne « Montant dû » de la matrice est vide (cf. deriveAmountDue ci-dessous).
  const [
    { data: summary, error },
    { data: monthRows, error: monthsError },
    { data: club, error: clubError },
  ] = await Promise.all([
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
    supabase
      .from('clubs')
      .select('min_contribution')
      .eq('id', clubId)
      .maybeSingle<Pick<ClubRow, 'min_contribution'>>(),
  ])
  if (error) throw error
  if (monthsError) throw monthsError
  if (clubError) throw clubError
  if (!summary) return null

  const months: MonthInput[] = (monthRows ?? []).map((r) => ({
    year: r.year,
    month: r.month,
    amount: Number(r.amount ?? 0),
    status: r.status,
    paidAt: r.paid_at,
  }))

  // RT-05 — montant dû. La colonne source `amount_due` prime si > 0 ; sinon on dérive
  // (nb de mois `late` post-adhésion ET ≤ mois courant) × min_contribution. Si le club est
  // introuvable (RLS/club supprimé), min_contribution → 0 : la dérivation rend 0 et le bandeau
  // basculera sur la variante SANS montant (jamais « 0,00 € »).
  const minContribution = club != null ? Number(club.min_contribution) : 0
  const amountDue = deriveAmountDue(
    Number(summary.amount_due ?? 0),
    months,
    joinedAtYM,
    nowYM,
    minContribution
  )

  return {
    clubId,
    // Statut global : la colonne feuille COTISATIONS prime, mais si elle est illisible
    // (`pending`) on dérive depuis la frise mensuelle déjà chargée (cohérence badge ↔ frise).
    status: deriveContributionStatus(summary.status, months, joinedAtYM, nowYM),
    userRole: membership.role,
    totalContributed: Number(summary.total_contributed ?? 0),
    // D2 — la colonne `months_count` vient d'une cellule #ERROR! (→ null/0). On dérive le
    // compte RÉEL des mois cotisés depuis l'historique chargé (statut `paid`), cohérent
    // avec la frise. NB : `months` est déjà borné à l'année courante (filtre .lte ci-dessus).
    monthsCount: months.filter((m) => m.status === 'paid').length,
    netMarketValue: summary.net_market_value != null ? Number(summary.net_market_value) : null,
    detentionPct: Number(summary.detention_pct ?? 0),
    penalties: Number(summary.penalties ?? 0),
    amountDue,
    syncedAt: summary.synced_at ?? null,
    years: buildTimelineYears(months, joinedAtYM, nowYM, cellLabels),
  }
}
