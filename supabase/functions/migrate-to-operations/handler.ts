// Handler pur de l'Edge Function `migrate-to-operations` (cahier §6.1 — module Opérations).
//
// Migre les données LEGACY d'un club (cotisations payées + transactions boursières) vers la
// nouvelle table `operations`, EN LECTURE SEULE sur les tables sources (LD-6 : on n'écrit
// jamais `contribution_months` / `transactions` / `positions`). Aucun I/O concret ici :
// toutes les seams passent par `MigrateDeps`. Testable en isolation côté Deno (pas de DB).
//
// IDEMPOTENCE — clé = TUPLE NATUREL, JAMAIS l'id legacy (arbitrage LEAD LD-2, BLOQUANT)
// ----------------------------------------------------------------------------------------
//   Le sync réécrit `transactions` en delete+insert intégral à chaque passe (cf.
//   supabase/functions/sync/index.ts §811-857) ⇒ `transactions.id` est VOLATIL : une clé
//   d'idempotence basée sur `metadata.original_id = transactions.id` ré-importerait en double
//   après chaque sync. On dédoublonne donc sur un TUPLE MÉTIER stable :
//     (club_id, type, operation_date, symbol, quantity, cash_delta)
//   restreint aux opérations déjà migrées (`source = 'matrice_migration'`). Pour les
//   cotisations, la clé porte membership_id + operation_date + cash_delta (le tuple naturel
//   uniformise les deux sources). `original_id` reste en `metadata` pour la traçabilité, mais
//   ne PARTICIPE PAS à la déduplication.
//
// DÉFENSIF sur les CHECKs DB (cahier §6.1) : une ligne legacy qui violerait une contrainte de
// `operations` (symbol requis pour buy/sell/dividend_cash/dividend_stock/valuation ;
// membership_id requis pour contribution/penalty/member_exit ; cash_delta NaN/null) est SKIPÉE
// (comptée dans `skipped_invalid`), JAMAIS insérée — la migration ne plante pas pour autant.

// ---- Types des lignes legacy (lecture seule) ----

/** Ligne `contribution_months` payée (jointe à memberships pour le club-scoping). */
export interface ContributionRow {
  id: string
  membership_id: string
  /** + amount (la cotisation augmente les espèces du club). */
  amount: number
  /** Date du versement effectif (filtré IS NOT NULL en amont). */
  paid_at: string
  year: number
  month: number
}

/** Ligne `transactions` (HISTORIQUE). `id` est VOLATIL (réécrit par le sync). */
export interface TransactionRow {
  id: string
  /** type legacy : buy | sell | dividend | coupon | other. */
  type: string
  symbol: string | null
  name: string | null
  quantity: number | null
  price: number | null
  total: number | null
  /** Date d'opération (filtré IS NOT NULL en amont). */
  transaction_date: string
}

// ---- Type d'insertion dans `operations` ----

export type OperationType =
  | 'contribution'
  | 'member_exit'
  | 'buy'
  | 'sell'
  | 'dividend_cash'
  | 'dividend_stock'
  | 'fee'
  | 'penalty'
  | 'valuation'

export interface OperationInsert {
  club_id: string
  type: OperationType
  status: 'confirmed'
  cash_delta: number
  membership_id: string | null
  symbol: string | null
  asset_name: string | null
  quantity: number | null
  unit_price: number | null
  operation_date: string
  source: 'matrice_migration'
  metadata: Record<string, unknown>
}

// ---- Clé naturelle d'idempotence (cf. en-tête) ----

export interface NaturalKey {
  club_id: string
  type: OperationType
  operation_date: string
  /** null si l'op ne porte pas de titre (cotisation, pénalité…). */
  symbol: string | null
  /** null si l'op ne porte pas de quantité. */
  quantity: number | null
  /** Mouvement cash signé (départage cotisations / pénalités sur le même membre/date). */
  cash_delta: number
}

// ---- Sortie structurée ----

export interface SkippedInvalid {
  reason: string
  legacy_table: 'contribution_months' | 'transactions'
  original_id: string
}

export interface MigrateResult {
  club_id: string
  inserted: number
  skipped: number
  by_type: Record<string, number>
  skipped_invalid?: SkippedInvalid[]
}

// ---- Seams injectables ----

export interface MigrateDeps {
  /** Cotisations PAYÉES (status='paid', paid_at IS NOT NULL) du club. Lecture seule. */
  listPaidContributions: (clubId: string) => Promise<ContributionRow[]>
  /** Transactions (transaction_date IS NOT NULL) du club. Lecture seule. */
  listTransactions: (clubId: string) => Promise<TransactionRow[]>
  /** True si une op `matrice_migration` matche déjà ce tuple naturel. */
  findExistingOperation: (key: NaturalKey) => Promise<boolean>
  /** Insère une op dans `operations`. SEULE écriture autorisée (LD-6). */
  insertOperation: (op: OperationInsert) => Promise<void>
  /** Log diagnostic (injectable pour test silencieux). */
  log?: (level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => void
}

// ---- Types requérant symbol / membership_id (défense CHECK) ----
const TYPES_REQUIRING_SYMBOL = new Set<OperationType>([
  'buy',
  'sell',
  'dividend_cash',
  'dividend_stock',
  'valuation',
])
const TYPES_REQUIRING_MEMBERSHIP = new Set<OperationType>([
  'contribution',
  'penalty',
  'member_exit',
])

/** Arrondi à 4 décimales (précision de cash_delta NUMERIC(18,4)) pour matcher la clé naturelle. */
function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 1e4) / 1e4
}

/** Mapping type legacy `transactions` → type `operations`. `other` → `fee` (cahier §6.1). */
function mapTransactionType(legacy: string): OperationType | null {
  switch (legacy) {
    case 'buy':
      return 'buy'
    case 'sell':
      return 'sell'
    case 'dividend':
    case 'coupon':
      return 'dividend_cash'
    case 'other':
      return 'fee'
    default:
      return null
  }
}

/**
 * Vérifie qu'une op candidate respecte les CHECKs de `operations`.
 * Retourne une raison si invalide (à pousser dans skipped_invalid), sinon null.
 */
function validateOperation(op: OperationInsert): string | null {
  if (!Number.isFinite(op.cash_delta)) {
    return 'cash_delta non fini (NaN/null) — quantity ou unit_price manquant'
  }
  if (TYPES_REQUIRING_SYMBOL.has(op.type) && (op.symbol == null || op.symbol.trim() === '')) {
    return `symbol requis pour le type ${op.type}`
  }
  if (
    TYPES_REQUIRING_MEMBERSHIP.has(op.type) &&
    (op.membership_id == null || op.membership_id === '')
  ) {
    return `membership_id requis pour le type ${op.type}`
  }
  // dividend_stock / valuation : cash_delta DOIT être 0 (CHECK DB).
  if ((op.type === 'dividend_stock' || op.type === 'valuation') && op.cash_delta !== 0) {
    return `cash_delta doit être 0 pour le type ${op.type}`
  }
  return null
}

/** Clé naturelle d'une op candidate (sans dépendre de l'id legacy). */
function naturalKeyOf(op: OperationInsert): NaturalKey {
  return {
    club_id: op.club_id,
    type: op.type,
    operation_date: op.operation_date,
    symbol: op.symbol,
    quantity: op.quantity,
    cash_delta: op.cash_delta,
  }
}

/**
 * Migration legacy → operations pour un club.
 *
 * 1. Cotisations payées → `contribution` (cash_delta = +amount).
 * 2. Transactions → buy/sell/dividend_cash/fee (cash_delta signé).
 * 3. Idempotence par TUPLE NATUREL (jamais l'id legacy) : findExistingOperation → skip.
 * 4. Défensif CHECK : ligne invalide → skipped_invalid, jamais d'insert NaN ou contraire au CHECK.
 * 5. Aucune écriture hors `operations`.
 */
export async function migrateToOperations(
  deps: MigrateDeps,
  clubId: string
): Promise<MigrateResult> {
  const log = deps.log ?? (() => {})
  const result: MigrateResult = {
    club_id: clubId,
    inserted: 0,
    skipped: 0,
    by_type: {},
    skipped_invalid: [],
  }

  // ── 1. Cotisations payées → contribution ──
  const contributions = await deps.listPaidContributions(clubId)
  for (const c of contributions) {
    const op: OperationInsert = {
      club_id: clubId,
      type: 'contribution',
      status: 'confirmed',
      cash_delta: round4(c.amount), // + : les espèces augmentent
      membership_id: c.membership_id,
      symbol: null,
      asset_name: null,
      quantity: null,
      unit_price: null,
      operation_date: c.paid_at,
      source: 'matrice_migration',
      metadata: {
        legacy_table: 'contribution_months',
        original_id: c.id,
        legacy_year: c.year,
        legacy_month: c.month,
      },
    }
    await processOperation(deps, op, 'contribution_months', c.id, result, log)
  }

  // ── 2. Transactions → buy / sell / dividend_cash / fee ──
  const transactions = await deps.listTransactions(clubId)
  for (const tx of transactions) {
    const type = mapTransactionType(tx.type)
    if (type === null) {
      result.skipped_invalid!.push({
        reason: `type legacy inconnu : ${tx.type}`,
        legacy_table: 'transactions',
        original_id: tx.id,
      })
      continue
    }
    const cashDelta = computeTransactionCashDelta(type, tx)
    const op: OperationInsert = {
      club_id: clubId,
      type,
      status: 'confirmed',
      cash_delta: Number.isFinite(cashDelta) ? round4(cashDelta) : cashDelta, // NaN propagé → validé/skipé
      membership_id: null,
      symbol: tx.symbol,
      asset_name: tx.name,
      quantity: tx.quantity,
      unit_price: tx.price,
      operation_date: tx.transaction_date,
      source: 'matrice_migration',
      metadata: {
        legacy_table: 'transactions',
        original_id: tx.id,
      },
    }
    await processOperation(deps, op, 'transactions', tx.id, result, log)
  }

  return result
}

/**
 * cash_delta signé d'une transaction (cahier §6.1) :
 *   buy           → -(quantity × price)    (les espèces diminuent)
 *   sell          → +(quantity × price)    (les espèces augmentent)
 *   dividend_cash → +(total ?? 0)          (dividende/coupon en espèces)
 *   fee (other)   →  (total ?? 0)          (frais ; signe tel quel dans la source)
 * Si quantity/price manquent sur buy/sell, le produit est NaN → validateOperation skip la ligne
 * (aucun NaN ne part en base).
 */
function computeTransactionCashDelta(type: OperationType, tx: TransactionRow): number {
  switch (type) {
    case 'buy': {
      if (tx.quantity == null || tx.price == null) return NaN
      return -(tx.quantity * tx.price)
    }
    case 'sell': {
      if (tx.quantity == null || tx.price == null) return NaN
      return tx.quantity * tx.price
    }
    case 'dividend_cash':
      return tx.total ?? 0
    case 'fee':
      return tx.total ?? 0
    default:
      return NaN
  }
}

/** Valide → vérifie l'idempotence (tuple naturel) → insère ou skip. Mutualisé sur les 2 sources. */
async function processOperation(
  deps: MigrateDeps,
  op: OperationInsert,
  legacyTable: SkippedInvalid['legacy_table'],
  originalId: string,
  result: MigrateResult,
  log: NonNullable<MigrateDeps['log']>
): Promise<void> {
  // a) Défense CHECK : jamais d'insert invalide.
  const invalid = validateOperation(op)
  if (invalid !== null) {
    result.skipped_invalid!.push({
      reason: invalid,
      legacy_table: legacyTable,
      original_id: originalId,
    })
    log('warn', 'Ligne legacy invalide — skip', { legacyTable, originalId, reason: invalid })
    return
  }

  // b) Idempotence — TUPLE NATUREL, pas l'id legacy (LD-2).
  const exists = await deps.findExistingOperation(naturalKeyOf(op))
  if (exists) {
    result.skipped += 1
    return
  }

  // c) Insert (seule écriture — operations uniquement, LD-6).
  await deps.insertOperation(op)
  result.inserted += 1
  result.by_type[op.type] = (result.by_type[op.type] ?? 0) + 1
}
