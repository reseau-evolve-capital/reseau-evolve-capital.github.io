import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/types.gen.ts'
import { mapOperationRow } from './mappers/operation.mapper.ts'
import type { Operation } from './types.ts'

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
