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

// ---- Types métier upsertables ----
export interface UserUpsert {
  email: string
  firstname: string
  lastname: string
  full_name: string
  phone?: string | null
  address?: string | null
}
export interface MembershipUpsert {
  club_id: string
  role: 'member'
  status: 'active' | 'left'
  joined_at: string | null
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
  country?: string | null
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
  currency: string | null
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
}
