// Couche data de l'écran « Vérification migration » (OPS-106, cahier §6.2).
//
// Compare, par club, les sources LEGACY (portfolio_aggregates / contribution_months /
// transactions) à la nouvelle table `operations`, sur 3 métriques :
//   1. Solde espèces : legacy = portfolio_aggregates (label 'Espèces', market_value)
//                      vs operations = RPC get_club_cash_balance() → delta.
//   2. Nb cotisations : COUNT(contribution_months status='paid')
//                      vs COUNT(operations type='contribution').
//   3. Nb transactions : COUNT(transactions)
//                      vs COUNT(operations type IN (buy,sell,dividend_cash)).
// Delta 0 → cohérent (ok=true) ; non-0 → écart à investiguer (ok=false).
//
// TOUTES les lectures passent par la RLS de la session courante (createServerClient) — JAMAIS de
// service-role côté web (règle CLAUDE.md). Le RPC get_club_cash_balance est SECURITY DEFINER mais
// gardé (refuse un club hors get_user_club_ids()), donc safe pour le club du trésorier comme pour
// les clubs du réseau lus par un network admin.
//
// Tolérance : la métrique « Solde espèces » est monétaire ; un écart d'arrondi sous CASH_EPSILON
// (1 centime) est considéré cohérent. Les compteurs exigent un delta strictement nul.
//
// Réf : lib/data/admin.ts (modèle COUNT RLS + AdminContext), packages/data operations (OPS-107),
//       migration 059 (get_club_cash_balance), cahier §6.2.

import { getClubCashBalance, type Database } from '@evolve/data'
import type { ClubVerifyData, MigrationVerifyRow } from '@evolve/ui'

type ServerClient = ReturnType<typeof import('@evolve/data').createServerClient>

/** Tolérance d'arrondi (1 centime) sur le solde espèces. En-deçà → cohérent. */
export const CASH_EPSILON = 0.01

/** Libellés des 3 métriques (clés stables ; le libellé affiché est injecté côté UI via i18n). */
export interface MigrationMetricLabels {
  cash: string
  contributions: string
  transactions: string
}

/** Construit une ligne `cash` (monétaire) : ok si l'écart absolu est sous CASH_EPSILON. */
function cashRow(metric: string, legacy: number, operations: number): MigrationVerifyRow {
  const delta = operations - legacy
  return {
    key: 'cash',
    metric,
    kind: 'cash',
    legacy,
    operations,
    delta,
    ok: Math.abs(delta) < CASH_EPSILON,
  }
}

/** Construit une ligne compteur : ok si le delta est strictement nul. */
function countRow(
  key: string,
  metric: string,
  legacy: number,
  operations: number
): MigrationVerifyRow {
  const delta = operations - legacy
  return { key, metric, kind: 'count', legacy, operations, delta, ok: delta === 0 }
}

/**
 * Lit un COUNT exact (head:true, aucune ligne ramenée) sur une table, en propageant les filtres
 * `eq`/`in` fournis. Retourne 0 sur erreur ou count null (jamais de NaN/undefined à l'écran).
 */
async function countExact(query: { count: number | null; error: unknown }): Promise<number> {
  return query.error ? 0 : (query.count ?? 0)
}

/**
 * Calcule les 3 lignes de comparaison d'UN club. Toutes les requêtes sont parallélisées et
 * passent par la RLS de la session. `metricLabels` = libellés déjà traduits (passés par la page).
 */
export async function getClubMigrationVerify(
  supabase: ServerClient,
  clubId: string,
  clubName: string,
  metricLabels: MigrationMetricLabels
): Promise<ClubVerifyData> {
  const [cashOps, cashLegacyRes, contribLegacyRes, contribOpsRes, txLegacyRes, txOpsRes] =
    await Promise.all([
      // 1. Solde espèces — operations (RPC gardé, fail-closed → number toujours fini).
      getClubCashBalance(supabase, clubId),
      // 1. Solde espèces — legacy : portfolio_aggregates label 'Espèces' (market_value).
      supabase
        .from('portfolio_aggregates')
        .select('market_value')
        .eq('club_id', clubId)
        .eq('label', 'Espèces')
        .maybeSingle<{ market_value: number | null }>(),
      // 2. Cotisations — legacy : COUNT(contribution_months status='paid').
      supabase
        .from('contribution_months')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', clubId)
        .eq('status', 'paid'),
      // 2. Cotisations — operations : COUNT(operations type='contribution', non annulées).
      supabase
        .from('operations')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', clubId)
        .eq('type', 'contribution')
        .eq('is_cancelled', false),
      // 3. Transactions — legacy : COUNT(transactions).
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', clubId),
      // 3. Transactions — operations : COUNT(operations type IN (buy,sell,dividend_cash)).
      supabase
        .from('operations')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', clubId)
        .in('type', ['buy', 'sell', 'dividend_cash'])
        .eq('is_cancelled', false),
    ])

  // Solde espèces legacy : market_value peut être null → 0 (jamais NaN).
  const cashLegacy = cashLegacyRes.error ? 0 : Number(cashLegacyRes.data?.market_value ?? 0)

  const [contribLegacy, contribOps, txLegacy, txOps] = await Promise.all([
    countExact(contribLegacyRes),
    countExact(contribOpsRes),
    countExact(txLegacyRes),
    countExact(txOpsRes),
  ])

  return {
    clubId,
    clubName,
    rows: [
      cashRow(metricLabels.cash, cashLegacy, cashOps),
      countRow('contributions', metricLabels.contributions, contribLegacy, contribOps),
      countRow('transactions', metricLabels.transactions, txLegacy, txOps),
    ],
  }
}

/** Une cible de vérification : club_id + nom (résolue par la page selon le rôle). */
export interface VerifyTarget {
  clubId: string
  clubName: string
}

/** Forme brute d'une ligne `network_list_clubs()` utile au scoping network admin. */
type NetworkClubsRow = Database['public']['Functions']['network_list_clubs']['Returns'][number]

/**
 * Résout les clubs à vérifier pour un NETWORK ADMIN : tous les clubs ACTIFS dont la matrice est
 * branchée (sheet_id non vide → `matrix_connected`). Passe par le RPC `network_list_clubs()`
 * (SECURITY DEFINER gardé membre réseau) — jamais de service-role. Trié par nom (déjà fait par le RPC).
 */
export async function getNetworkVerifyTargets(supabase: ServerClient): Promise<VerifyTarget[]> {
  const { data, error } = await supabase.rpc('network_list_clubs')
  if (error) return []
  return ((data ?? []) as NetworkClubsRow[])
    .filter((c) => (c.is_active ?? true) && Boolean(c.matrix_connected))
    .map((c) => ({ clubId: c.id, clubName: c.name }))
}
