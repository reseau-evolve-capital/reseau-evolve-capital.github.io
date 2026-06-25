import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/types.gen.ts'
import { mapOperationRow } from './mappers/operation.mapper.ts'
import { mapOperationPositionRow } from './mappers/position.mapper.ts'
import type { Operation, OperationPosition, OperationType } from './types.ts'

/**
 * Client Opérations (OPS-107) — fines enveloppes de lecture typées autour de la table
 * `operations` et de la RPC `get_club_cash_balance` (migration 057).
 *
 * À utiliser depuis `apps/web` (Server Action / RSC) avec un client Supabase RLS
 * (createServerClient). La RLS filtre déjà par club ; ces helpers sont donc « fail-closed » :
 * en cas d'erreur (RLS refusée, RPC en échec) ils renvoient un état vide neutre (0 / [])
 * plutôt que de throw, conformément à CLAUDE.md (« jamais de crash vide à l'écran »).
 */

type Db = Database

/**
 * Solde de trésorerie du club via la RPC `get_club_cash_balance`.
 * Renvoie toujours un `number` fini : `0` si null, erreur, ou valeur non numérique.
 */
export async function getClubCashBalance(
  supabase: SupabaseClient<Db>,
  clubId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('get_club_cash_balance', { p_club_id: clubId })
  if (error) return 0
  return typeof data === 'number' && Number.isFinite(data) ? data : 0
}

/**
 * Liste les opérations récentes d'un club, triées par date d'opération décroissante.
 * Renvoie `[]` en cas d'erreur ou d'absence de données ; chaque ligne est normalisée
 * via `mapOperationRow` (DTO métier, jamais de NaN/undefined).
 */
export async function listRecentOperations(
  supabase: SupabaseClient<Db>,
  clubId: string,
  limit = 50
): Promise<Operation[]> {
  const { data, error } = await supabase
    .from('operations')
    .select('*')
    .eq('club_id', clubId)
    .order('operation_date', { ascending: false })
    .limit(limit)
  if (error || data == null) return []
  return data.map(mapOperationRow)
}

/** Filtres et pagination de `listOperations`. */
export interface ListOperationsOptions {
  /** Restreint aux types donnés (CHECK operations.type). Vide/absent = tous. */
  types?: OperationType[]
  /** Restreint à un membre (membership_id). `null` ou absent = tous membres. */
  membershipId?: string | null
  /** Borne basse incluse sur operation_date (date ISO `YYYY-MM-DD`). */
  from?: string
  /** Borne haute incluse sur operation_date (date ISO `YYYY-MM-DD`). */
  to?: string
  /** Taille de page (défaut 50). */
  limit?: number
  /** Décalage de pagination (défaut 0). */
  offset?: number
}

/**
 * Liste filtrée et paginée des opérations d'un club (OPS-205).
 *
 * Filtre par club_id, puis applique les filtres optionnels (type IN, membership_id,
 * borne basse/haute sur operation_date). Tri operation_date DESC puis recorded_at DESC.
 * Pagination via `.range(offset, offset + limit - 1)`. Chaque ligne est normalisée via
 * `mapOperationRow`. Renvoie `[]` en cas d'erreur (fail-closed, cf. listRecentOperations).
 */
export async function listOperations(
  supabase: SupabaseClient<Db>,
  clubId: string,
  opts: ListOperationsOptions = {}
): Promise<Operation[]> {
  const limit = opts.limit ?? 50
  const offset = opts.offset ?? 0

  let query = supabase.from('operations').select('*').eq('club_id', clubId)

  if (opts.types && opts.types.length > 0) query = query.in('type', opts.types)
  if (opts.membershipId != null) query = query.eq('membership_id', opts.membershipId)
  if (opts.from) query = query.gte('operation_date', opts.from)
  if (opts.to) query = query.lte('operation_date', opts.to)

  const { data, error } = await query
    .order('operation_date', { ascending: false })
    .order('recorded_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error || data == null) return []
  return data.map(mapOperationRow)
}

/**
 * Positions agrégées du club dérivées des opérations buy/sell via la RPC
 * `get_club_positions_from_ops` (migration 060). Chaque ligne est normalisée via
 * `mapOperationPositionRow` (défensif, jamais NaN/undefined). Renvoie `[]` si erreur.
 */
export async function getClubPositionsFromOps(
  supabase: SupabaseClient<Db>,
  clubId: string
): Promise<OperationPosition[]> {
  const { data, error } = await supabase.rpc('get_club_positions_from_ops', { p_club_id: clubId })
  if (error || data == null) return []
  return data.map(mapOperationPositionRow)
}
