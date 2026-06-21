// Couche data du dashboard membre (DSH-006).
//
// `member_quote_part` est une vue (security_invoker, migration 030) : recalculée à chaque
// requête → toujours à jour, suit la cascade de re-key user_id à la 1re connexion (pas de MV
// figée). Elle porte la valeur BOOK (`net_market_value`) — décision V0 : pas de prix live ici.
// La RLS des tables sous-jacentes isole les lignes par `auth.uid()` (policies memberships +
// contributions « own read »).
//
// `syncedAt` exposé à l'UI vient de `clubs.synced_at` (timestamp du CLUB, MAJ à chaque sync),
// pas de `member_quote_part.synced_at` (par-membre, désynchronisable) : source unique partagée
// avec la topbar desktop (layout (app)) pour un statut de sync cohérent desktop/mobile (E2).
//
// Réf : DATA_MODEL.md §2 (vue member_quote_part), CLAUDE.md (valorisation book V0).

import type { createServerClient } from '@evolve/data'
import type { Database } from '@evolve/data'

import { deriveContributionStatus, joinedAtToYM } from './contributionStatus'
import { normalizeAggregateLabel } from './portfolio'

/** Client Supabase serveur tel que retourné par `createServerClient` (session + RLS). */
type ServerClient = ReturnType<typeof createServerClient>

type MemberQuotePartRow = Database['public']['Views']['member_quote_part']['Row']
type UserRow = Database['public']['Tables']['users']['Row']
type ClubRow = Database['public']['Tables']['clubs']['Row']
type ContributionMonthRow = Database['public']['Tables']['contribution_months']['Row']

export type ContributionStatus = Database['public']['Enums']['contribution_status']
export type MemberRole = Database['public']['Enums']['member_role']

export interface DashboardData {
  member: { firstname: string | null; fullName: string; role: MemberRole; joinedAt: string | null }
  clubId: string
  netMarketValue: number
  detentionPct: number // fraction 0..1
  totalContributed: number
  contribution: { status: ContributionStatus; amountDue: number }
  /** Capacité d'investissement annuelle (E3) — réutilise le calcul de l'attestation :
   *  `remaining = annual_investment_cap − investissement payé de l'année en cours`.
   *  `cap`/`remaining` null si le plafond n'est pas renseigné sur le club. */
  investment: { cap: number | null; yearInvested: number; remaining: number | null }
  club: { name: string }
  /** Valorisation RÉELLE du portefeuille du club (teaser dashboard V2). Lue depuis l'agrégat
   *  « Portefeuille » de `portfolio_aggregates` — MÊME source que la page /portfolio, donc
   *  valeurs cohérentes entre les deux écrans (fin du teaser demo codé en dur).
   *  `value` null si l'agrégat est absent ; `gainLoss*` null si le prix d'achat club manque. */
  clubPortfolio: ClubPortfolioSummary
  syncedAt: string | null
}

/** Synthèse de la valo club affichée sur la carte teaser (valeur + gain/perte total). */
export interface ClubPortfolioSummary {
  /** Valeur de marché de l'agrégat « Portefeuille » (€), ou null si absent. */
  value: number | null
  /** Gain/perte total en € (valeur de marché − prix d'achat), ou null si prix d'achat absent. */
  gainLossEur: number | null
  /** Gain/perte total en fraction 0..1 (pour formatPct), ou null si prix d'achat absent/nul. */
  gainLossPct: number | null
}

/** Libellé normalisé de l'agrégat « Portefeuille » (= total club affiché). */
const PORTEFEUILLE_AGG_LABEL = 'portefeuille'

/**
 * Calcule la synthèse de valo club depuis les lignes d'agrégat. PUR.
 * Le gain/perte total dérive de l'agrégat « Portefeuille » (market_value vs book_value) — c'est
 * le « Gain/perte total » du club, cohérent dans l'esprit avec celui de /portfolio. Si le prix
 * d'achat (book_value) est absent ou ≤ 0, on n'affiche que la valeur (gain/perte null).
 */
export function clubPortfolioFromAggregates(
  rows: Array<{ label: string; market_value: number | null; book_value: number | null }>
): ClubPortfolioSummary {
  const row = rows.find((a) => normalizeAggregateLabel(a.label) === PORTEFEUILLE_AGG_LABEL)
  const value =
    typeof row?.market_value === 'number' && Number.isFinite(row.market_value)
      ? row.market_value
      : null
  const book =
    typeof row?.book_value === 'number' && Number.isFinite(row.book_value) ? row.book_value : null
  if (value === null || book === null || book <= 0) {
    return { value, gainLossEur: null, gainLossPct: null }
  }
  const gainLossEur = value - book
  return { value, gainLossEur, gainLossPct: gainLossEur / book }
}

const STATUS_LABEL: Record<ContributionStatus, string> = {
  ok: 'À jour',
  pending: 'En attente',
  late: 'En retard',
  exempt: 'Exempté',
}

export function contributionStatusLabel(s: ContributionStatus): string {
  return STATUS_LABEL[s] ?? '—'
}

/** Charge les données dashboard du membre courant. RLS isole par auth.uid().
 *  Retourne null si aucune ligne member_quote_part (état empty). */
export async function getDashboardData(
  supabase: ServerClient,
  userId: string,
  clubId: string
): Promise<DashboardData | null> {
  // 4 lectures indépendantes → parallélisées (fix latence par-navigation, ticket C).
  // La vue ne porte PAS les colonnes de nom : profil lu séparément (DATA_MODEL.md §2).
  // `clubs.synced_at` : source unique du statut de sync (E2), partagée avec la topbar.
  // `memberships.id` : requis pour cibler contribution_months (clé par adhésion, E3).
  const [
    { data: mqp, error },
    { data: profile },
    { data: club },
    { data: membership },
    { data: aggRows },
  ] = await Promise.all([
    supabase
      .from('member_quote_part')
      .select(
        'role, joined_at, detention_pct, total_contributed, net_market_value, contribution_status, amount_due'
      )
      .eq('user_id', userId)
      .eq('club_id', clubId)
      .maybeSingle<
        Pick<
          MemberQuotePartRow,
          | 'role'
          | 'joined_at'
          | 'detention_pct'
          | 'total_contributed'
          | 'net_market_value'
          | 'contribution_status'
          | 'amount_due'
        >
      >(),
    supabase
      .from('users')
      .select('firstname, full_name')
      .eq('id', userId)
      .maybeSingle<Pick<UserRow, 'firstname' | 'full_name'>>(),
    supabase
      .from('clubs')
      .select('name, synced_at, annual_investment_cap')
      .eq('id', clubId)
      .maybeSingle<Pick<ClubRow, 'name' | 'synced_at' | 'annual_investment_cap'>>(),
    supabase
      .from('memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('club_id', clubId)
      .maybeSingle<{ id: string }>(),
    // Agrégats du club (RLS isole par club, comme /portfolio) → valo club RÉELLE du teaser V2.
    // Un échec de lecture ne casse PAS le dashboard : `aggRows` null → clubPortfolio.value null.
    supabase
      .from('portfolio_aggregates')
      .select('label, market_value, book_value')
      .eq('club_id', clubId)
      .eq('is_active', true),
  ])
  if (error) throw error
  if (!mqp) return null

  const clubPortfolio = clubPortfolioFromAggregates(
    (aggRows as Array<{
      label: string
      market_value: number | null
      book_value: number | null
    }> | null) ?? []
  )

  // E3 — capacité d'investissement restante de l'année (même calcul que l'attestation :
  // plafond annuel du club − somme des mois cotisés `paid` de l'année en cours).
  //
  // Même requête mensuelle réutilisée pour DÉRIVER le statut de cotisation : la colonne « statut »
  // de la feuille COTISATIONS bugge parfois (→ `pending`), on retombe alors sur l'échéancier réel
  // (cf. deriveContributionStatus). On élargit donc le filtre à tous les mois ≤ année courante
  // (et non plus le seul mois `paid` de l'année), puis on filtre côté JS pour `yearInvested`.
  const cap = club?.annual_investment_cap != null ? Number(club.annual_investment_cap) : null
  let yearInvested = 0
  let contributionStatus = mqp.contribution_status ?? 'pending'
  if (membership?.id) {
    const now = new Date()
    const currentYear = now.getFullYear()
    const nowYM = currentYear * 12 + now.getMonth()
    const { data: months } = await supabase
      .from('contribution_months')
      .select('year, month, amount, status')
      .eq('membership_id', membership.id)
      .lte('year', currentYear)
      .returns<Pick<ContributionMonthRow, 'year' | 'month' | 'amount' | 'status'>[]>()
    const rows = months ?? []
    yearInvested = rows
      .filter((m) => m.year === currentYear && m.status === 'paid')
      .reduce((sum, m) => sum + Number(m.amount ?? 0), 0)
    contributionStatus = deriveContributionStatus(
      contributionStatus,
      rows.map((m) => ({ year: m.year, month: m.month, status: m.status })),
      joinedAtToYM(mqp.joined_at),
      nowYM
    )
  }
  const remaining = cap === null ? null : Math.max(0, cap - yearInvested)

  return {
    member: {
      firstname: profile?.firstname ?? null,
      fullName: profile?.full_name ?? 'Membre',
      role: mqp.role ?? 'member',
      joinedAt: mqp.joined_at,
    },
    clubId,
    netMarketValue: Number(mqp.net_market_value ?? 0),
    detentionPct: Number(mqp.detention_pct ?? 0),
    totalContributed: Number(mqp.total_contributed ?? 0),
    contribution: {
      status: contributionStatus,
      amountDue: Number(mqp.amount_due ?? 0),
    },
    investment: { cap, yearInvested, remaining },
    club: { name: club?.name ?? '—' },
    clubPortfolio,
    // E2 : statut de sync unifié sur le timestamp du CLUB (≠ member_quote_part.synced_at par-membre).
    syncedAt: club?.synced_at ?? null,
  }
}
