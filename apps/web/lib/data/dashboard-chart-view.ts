// Helpers PURS de présentation de la série live du graphe « Évolution » (DSH-012).
//
// Le serveur (DSH-011, dashboard-chart.ts) retourne la série MAX complète triée ASC
// (~2 900 points) ; c'est le CLIENT qui filtre par période, résume et échantillonne :
//   - slicePeriod  : coupe calendaire « dernière date − N jours » (7/30/90/365, 'max' = tout) ;
//   - summarize    : delta premier → dernier du slice (mêmes gardes que computeVariation :
//                    null si < 2 points ou base ≤ 0 — jamais de NaN/Infinity) ;
//   - downsample   : échantillonnage régulier déterministe ≤ max points (défaut 400),
//                    premier et dernier points TOUJOURS conservés (ancrage des axes).
//
// Aucune dépendance React/DOM/Date.now : module pur, testé en Vitest node.
// Le formatage (formatEUR/formatPct) reste dans la vue — jamais ici.
//
// Réf : DSH-011 (contrat DashboardChartData), DSH-012 (branchement graphe).

import type { DashboardChartPeriod, DashboardChartPoint } from './dashboard-chart'

const DAY_MS = 86_400_000

/** Nombre de jours calendaires couverts par chaque période bornée. */
const PERIOD_DAYS: Record<Exclude<DashboardChartPeriod, 'max'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
}

/** Plafond de points par défaut passés au chart (Recharts) — au-delà, on échantillonne. */
const DEFAULT_MAX_POINTS = 400

/**
 * Coupe la série (triée ASC) à la période demandée : cutoff calendaire =
 * dernière date − N jours ; tout point de date ≥ cutoff est gardé (les trous
 * week-end/jours fériés des séries REPORTING sont donc tolérés). `'max'` = série
 * entière. L'ordre ASC est préservé (la série d'entrée est déjà triée — contrat DSH-011).
 * PUR — retourne un nouveau tableau (jamais de mutation de l'entrée).
 */
export function slicePeriod(
  series: DashboardChartPoint[],
  period: DashboardChartPeriod
): DashboardChartPoint[] {
  if (period === 'max') return [...series]
  const last = series[series.length - 1]
  if (!last) return []
  const lastMs = Date.parse(last.date)
  // Dernière date non parseable (série corrompue) → on retourne tout plutôt que de vider.
  if (Number.isNaN(lastMs)) return [...series]
  const cutoffMs = lastMs - PERIOD_DAYS[period] * DAY_MS
  return series.filter((p) => {
    const ms = Date.parse(p.date)
    return !Number.isNaN(ms) && ms >= cutoffMs
  })
}

/**
 * Delta premier → dernier point du slice. Mêmes règles que computeVariation (DSH-011) :
 * null si < 2 points ou base ≤ 0 (un % sur base nulle/négative n'a pas de sens) ;
 * `deltaPct` est une FRACTION (0.0455 = +4,55 %) pour formatPct. Jamais de NaN/Infinity. PUR.
 */
export function summarize(
  slice: DashboardChartPoint[]
): { deltaEur: number; deltaPct: number } | null {
  if (slice.length < 2) return null
  const first = slice[0]
  const last = slice[slice.length - 1]
  if (!first || !last) return null
  if (!(first.value > 0)) return null
  const deltaEur = last.value - first.value
  const deltaPct = deltaEur / first.value
  if (!Number.isFinite(deltaEur) || !Number.isFinite(deltaPct)) return null
  return { deltaEur, deltaPct }
}

/**
 * Échantillonnage régulier déterministe : si `points.length ≤ max`, identité (même
 * référence de contenu, nouveau tableau non requis) ; sinon `max` points répartis
 * linéairement sur les index, premier et dernier points TOUJOURS inclus.
 * Déterministe : mêmes entrées → mêmes sorties (aucun aléa). PUR.
 */
export function downsample(
  points: DashboardChartPoint[],
  max: number = DEFAULT_MAX_POINTS
): DashboardChartPoint[] {
  // max < 2 n'a pas de sens (on garantit premier + dernier) → clamp défensif.
  const target = Math.max(2, Math.floor(max))
  if (points.length <= target) return points
  const lastIndex = points.length - 1
  const result: DashboardChartPoint[] = []
  for (let i = 0; i < target; i++) {
    // Répartition linéaire des index ; i=0 → 0, i=target−1 → lastIndex (exacts).
    const index = Math.round((i * lastIndex) / (target - 1))
    const point = points[index]
    if (point) result.push(point)
  }
  return result
}
