// Types partagés pour l'ingestion Google Sheets → Supabase.
// Pattern DTO strict : chaque ligne de feuille a un *RowDTO (brut), mappé vers un *Upsert (métier).

// ---- DTO bruts (issus de readSheet) ----
export interface BaseRowDTO {
  fullName: string
  email: string
  joinedAt: string | null
  leftAt: string | null
  status: string
  requestedAt?: string | null
  filesSentAt?: string | null
  phone?: string | null
  address?: string | null
  leftWithAmount?: number | null
}
export interface ParametragesRowDTO {
  clubName: string
  minContribution: number
  penaltyRate?: number | null
  city?: string | null
  country?: string | null
  /** Identifiant du club chez le courtier (TEXT brut, zéros non significatifs conservés). */
  brokerAccountRef?: string | null
  /** Limite de cotisation annuelle (NUMERIC). */
  annualInvestmentCap?: number | null
  /** Nom du courtier (ex. « BOURSE DIRECT ») — rangé dans clubs.settings (pas de colonne dédiée). */
  brokerName?: string | null
  /**
   * Nom complet du Président(e) tel qu'écrit dans PARAMETRAGES (brut, non normalisé).
   * Sert UNIQUEMENT à la réconciliation des rôles côté `sync` (matching vers users.full_name) —
   * jamais persisté tel quel. null si la ligne est absente de la feuille.
   */
  presidentName?: string | null
  /**
   * Nom complet du Trésorier(e) tel qu'écrit dans PARAMETRAGES (brut, non normalisé).
   * Même usage que `presidentName` (réconciliation des rôles). null si absent.
   */
  treasurerName?: string | null
}
export interface PortefeuilleRowDTO {
  name: string
  symbol: string
  category: string | null
  quantity: number | null
  currency: string | null
  marketPriceEur: number | null
  marketValue: number | null
  allocationPct: number | null
  pump: number | null
  bookValue: number | null
  pe: number | null
  eps: number | null
  gainLossPct: number | null
  gainLossEur: number | null
  sector: string | null
  stopLossPct: number | null
  takeProfitPct: number | null
  perfCible: number | null
  perfCalibree: number | null
  stopLossValue: number | null
  takeProfitValue: number | null
  currencyRef: string | null
  typologie: string | null
}
export interface HistoriqueRowDTO {
  type: string
  symbol: string | null
  name: string | null
  quantity: number | null
  price: number | null
  total: number | null
  transactionDate: string | null
  notes: string | null
}
export interface CotisationsRowDTO {
  fullName: string
  monthsCount: number | null
  detentionPct: number | null
  penalties: number | null
  totalContributed: number | null
  netMarketValue: number | null
  status: string | null
  amountDue: number | null
}
/** REPORTING (série quotidienne club, DSH-011) — cols A–E brutes de la matrice. */
export interface ReportingRowDTO {
  /** Col A brute, date avec jour de semaine (« dimanche, 03/05/2026 »). */
  reportDateRaw: string | null
  /** Col B — valorisation portefeuille. */
  portfolioValue: number | null
  /** Col C — cotisations cumulées. */
  totalContributions: number | null
  /** Col D — plus-value (= B−C, parfois vide en source). */
  capitalGain: number | null
  /** Col E — performance (ratio B/C, PAS un % ; parfois vide en source). */
  performanceRatio: number | null
}

// ---- Types métier upsertables ----
export interface UserUpsert {
  email: string
  firstname: string
  lastname: string
  full_name: string
  phone?: string | null
  address?: string | null
  /**
   * true = email synthétique généré à l'import (membre Base sans email).
   * Déterministe entre syncs ; ne reçoit jamais de magic link. Cf. migration 026.
   */
  email_is_placeholder: boolean
}
export interface MembershipUpsert {
  club_id: string
  // Pas de `role` : la feuille Base ne détermine pas la gouvernance. Le rôle est dérivé de
  // PARAMETRAGES (réconciliation sync) ; à l'insert la colonne prend son défaut DB ('member'),
  // à l'update le rôle existant (president/treasurer dérivé, ou network_admin) est préservé.
  status: 'active' | 'left'
  /** format 'yyyy-mm-dd' pour colonne Postgres DATE, ou null. */
  joined_at: string | null
  /** format 'yyyy-mm-dd' pour colonne Postgres DATE, ou null. */
  leave_at?: string | null
  leave_with_amount?: number | null
}
export interface ClubUpsert {
  name: string
  slug: string
  sheet_id: string
  min_contribution: number
  currency?: string
  city?: string | null
  /** Code ISO 3166-1 alpha-2. Nullable depuis migration 024 (saisi par l'admin plus tard). */
  country?: string | null
  /** Identifiant du club chez le courtier (clubs.broker_account_ref TEXT, migration 022). */
  broker_account_ref?: string | null
  /** Limite de cotisation annuelle (clubs.annual_investment_cap NUMERIC, migration 022). */
  annual_investment_cap?: number | null
  settings?: Record<string, unknown>
}
export interface PositionUpsert {
  club_id: string
  name: string
  symbol: string
  category: string | null
  sector: string | null
  typologie: string | null
  quantity: number | null
  /** Colonne positions.currency NOT NULL DEFAULT 'EUR' (migration 005) : jamais null (défaut 'EUR' posé par le mapper). */
  currency: string
  currency_ref: string | null
  market_price_eur: number | null
  market_value: number | null
  book_value: number | null
  allocation_pct: number | null
  pump: number | null
  pe: number | null
  eps: number | null
  gain_loss_pct: number | null
  gain_loss_eur: number | null
  stop_loss_pct: number | null
  take_profit_pct: number | null
  perf_cible: number | null
  perf_calibree: number | null
  stop_loss_value: number | null
  take_profit_value: number | null
}
export interface AggregateUpsert {
  club_id: string
  /** Libellé brut de la ligne d'agrégat (col A), ex. « Portefeuille », « Provision ». Clé onConflict avec club_id. */
  label: string
  market_value: number | null
  book_value: number | null
  allocation_pct: number | null
}
export interface TransactionUpsert {
  club_id: string
  type: 'buy' | 'sell' | 'dividend' | 'coupon' | 'other'
  symbol: string | null
  name: string | null
  quantity: number | null
  price: number | null
  total: number | null
  transaction_date: string | null
  notes: string | null
}
export interface ContributionUpsert {
  membership_id: string
  club_id: string
  months_count: number
  detention_pct: number
  total_contributed: number
  penalties: number
  net_market_value: number | null
  status: 'ok' | 'pending' | 'late' | 'exempt'
  amount_due: number
}
/** Ligne upsertable dans club_reporting_daily (migration 034) — clé (club_id, report_date). */
export interface ClubReportingDailyUpsert {
  club_id: string
  /** Format ISO 'yyyy-mm-dd' pour colonne Postgres DATE. */
  report_date: string
  portfolio_value: number
  total_contributions: number
  /** Plus-value (col D, recalculée B−C par le mapper si absente en source). */
  capital_gain: number | null
  /** Ratio B/C (col E, recalculé par le mapper si absent ET C > 0 ; null si C = 0). */
  performance_ratio: number | null
  synced_at: string
}
export interface ContributionMonthUpsert {
  membership_id: string
  club_id: string
  year: number
  month: number
  amount: number
  status: 'paid' | 'due' | 'late' | 'exempt'
  due_date: string | null
}

/** Vue minimale d'un membership chargé depuis la DB pour le lookup par nom. */
export interface MembershipLookup {
  id: string
  user_id: string
  full_name: string
  /**
   * Email ACTUEL du user en base. Optionnel : la résolution Base (resolveBaseEmail) en a
   * besoin pour réutiliser l'email existant quand la feuille est vide ; les lookups cotisations
   * ne s'en servent pas. `loadMembershipLookups` le peuple toujours.
   */
  email?: string | null
  /** Drapeau placeholder du user en base (cf. note ci-dessus). */
  email_is_placeholder?: boolean
}
