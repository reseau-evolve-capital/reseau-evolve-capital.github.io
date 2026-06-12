// Couche data du graphe « Évolution » du dashboard V2 (DSH-011).
//
// Lit la série historique `club_reporting_daily` (alimentée par la sync REPORTING, migration 034)
// et en dérive la quote-part du membre. Ce module sera branché sur le graphe par DSH-012 ;
// tant qu'il retourne null (aucune ligne REPORTING en base), le V2 reste en mode demo.
//
// HYPOTHÈSE PRODUIT (approximation V0 assumée) :
//   quote_part_membre(date) ≈ portfolio_value(date) × detention_pct_actuel
// La détention ACTUELLE est appliquée à tout l'historique — si elle a changé dans le temps,
// les points anciens sont approximés (pas d'historique de détention en V0). Pour borner cette
// approximation sur la période MAX, la série est coupée à `report_date >= joinedAt` (date
// d'adhésion du membre) quand `joinedAt` est parseable.
//
// La série COMPLÈTE (triée ASC) est retournée au client, qui filtre lui-même par période
// (7d/30d/90d/1y/max) — un seul aller-retour serveur, pas une requête par période.
// Le formatage (formatEUR/formatPct) reste côté UI — jamais de toLocaleString ici.
//
// Réf : DSH-011 (couche lecture), DSH-012 (branchement graphe), migration 034.

import type { createServerClient, Database } from '@evolve/data'

/** Client Supabase serveur tel que retourné par `createServerClient` (session + RLS). */
type ServerClient = ReturnType<typeof createServerClient>

type ClubReportingDailyRow = Database['public']['Tables']['club_reporting_daily']['Row']

/** Sous-ensemble de colonnes lues pour la série du graphe. */
type ReportingPointRow = Pick<ClubReportingDailyRow, 'report_date' | 'portfolio_value'>

/** Périodes proposées par le graphe — le FILTRAGE par période est fait côté client. */
export type DashboardChartPeriod = '7d' | '30d' | '90d' | '1y' | 'max'

export interface DashboardChartPoint {
  /** ISO date calendaire (YYYY-MM-DD), timezone UTC midnight */
  date: string
  /** Quote-part membre dérivée (EUR), formaté côté UI via formatEUR */
  value: number
}

export interface DashboardChartVariation {
  /** Delta EUR sur la période. */
  amount: number
  /** Fraction (0.0455 = +4,55 %), pour TrendBadge / formatPct. */
  percent: number
}

export interface DashboardChartData {
  source: 'live'
  /** Série complète triée ASC ; le client filtre par période */
  series: DashboardChartPoint[]
  variations: {
    d1: DashboardChartVariation | null
    d30: DashboardChartVariation | null
    max: DashboardChartVariation | null
  }
  /** Meta debug / QA — pas exposée GA4 */
  meta: {
    clubId: string
    pointCount: number
    firstDate: string | null
    lastDate: string | null
    detentionPctUsed: number
    joinedAtCutoff: string | null
  }
}

const DAY_MS = 86_400_000

/** Taille de page PostgREST — voir le commentaire pagination dans getDashboardChartData. */
const PAGE_SIZE = 1000

/**
 * Normalise `joinedAt` en cutoff calendaire YYYY-MM-DD (UTC). Retourne null si la date
 * n'est pas parseable (le cutoff est alors ignoré plutôt que de vider la série). PUR.
 */
function normalizeJoinedAtCutoff(joinedAt: string | null): string | null {
  if (joinedAt === null) return null
  const ms = Date.parse(joinedAt)
  if (Number.isNaN(ms)) return null
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Dérive la série quote-part membre depuis les lignes club : `value = portfolio_value × detentionPct`
 * (hypothèse produit V0, voir en-tête). Coupe à `report_date >= joinedAt` si parseable, écarte tout
 * point non fini (jamais de NaN à l'écran) et garantit le tri ASC. PUR (testé).
 */
export function deriveMemberSeries(
  clubRows: { report_date: string; portfolio_value: number }[],
  detentionPct: number,
  joinedAt: string | null
): DashboardChartPoint[] {
  const cutoff = normalizeJoinedAtCutoff(joinedAt)

  const points: DashboardChartPoint[] = []
  for (const row of clubRows) {
    // Date non parseable → écartée (sinon NaN dans les calculs de variation en aval).
    if (Number.isNaN(Date.parse(row.report_date))) continue
    // Normalisation calendaire YYYY-MM-DD (contrat DashboardChartPoint.date).
    const date = row.report_date.slice(0, 10)
    if (cutoff !== null && date < cutoff) continue
    // Coercition Number() : numeric Postgres peut arriver en string selon le client.
    const value = Number(row.portfolio_value) * detentionPct
    // Jamais de NaN/Infinity dans la série (convention « pas de NaN à l'écran »).
    if (!Number.isFinite(value)) continue
    points.push({ date, value })
  }

  // Tri ASC garanti même si la source est désordonnée (comparaison ISO = chronologique).
  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return points
}

/**
 * Variation entre le dernier point et un point de comparaison :
 * - `'max'` → premier point de la série ;
 * - `n` jours → le point le plus proche CALENDAIREMENT de `lastDate − n jours` (les séries
 *   REPORTING ont des trous week-end/jours fériés ; si l'historique est plus court que n jours,
 *   la cible tombe avant le premier point → comparaison = premier point). À distance égale,
 *   le point le plus ancien gagne (la variation couvre au moins n jours).
 * Retourne null si : < 2 points, point de comparaison = dernier point lui-même, ou
 * `start ≤ 0` (un percent sur base nulle/négative n'a pas de sens → pas de TrendBadge).
 * Jamais de NaN/Infinity. PUR (testé).
 */
export function computeVariation(
  series: DashboardChartPoint[],
  daysBack: number | 'max'
): DashboardChartVariation | null {
  if (series.length < 2) return null
  const first = series[0]
  const end = series[series.length - 1]
  if (!first || !end) return null

  let start: DashboardChartPoint
  if (daysBack === 'max') {
    start = first
  } else {
    const targetMs = Date.parse(end.date) - daysBack * DAY_MS
    let best = first
    let bestIndex = 0
    let bestDist = Math.abs(Date.parse(first.date) - targetMs)
    for (let i = 1; i < series.length; i++) {
      const p = series[i]
      if (!p) continue
      const dist = Math.abs(Date.parse(p.date) - targetMs)
      // `<` strict : à égalité de distance, le point le plus ancien (déjà retenu) gagne.
      if (dist < bestDist) {
        best = p
        bestIndex = i
        bestDist = dist
      }
    }
    // Le point de comparaison est le dernier lui-même → pas de période à comparer.
    if (bestIndex === series.length - 1) return null
    start = best
  }

  // percent sur base nulle/négative → pas de variation affichable (pas de TrendBadge).
  if (!(start.value > 0)) return null
  const amount = end.value - start.value
  const percent = amount / start.value
  if (!Number.isFinite(amount) || !Number.isFinite(percent)) return null
  return { amount, percent }
}

/**
 * Charge la série REPORTING du club et dérive les données du graphe membre.
 * RLS membre s'applique sur `club_reporting_daily` (lecture par club du membre).
 * Retourne null si aucune ligne REPORTING en base (V2 reste en mode demo).
 */
export async function getDashboardChartData(
  supabase: ServerClient,
  userId: string,
  clubId: string,
  opts: { detentionPct: number; joinedAt: string | null }
): Promise<DashboardChartData | null> {
  // ⚠ PostgREST plafonne chaque requête à 1 000 lignes (max-rows) et la série REPORTING
  // dépasse largement ce plafond (~2 900+ lignes d'historique quotidien) : sans pagination,
  // le graphe serait silencieusement tronqué aux 1 000 premiers jours. On pagine donc avec
  // `.range()` en boucle jusqu'à recevoir une page incomplète (= dernière page).
  const rows: ReportingPointRow[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('club_reporting_daily')
      .select('report_date, portfolio_value')
      .eq('club_id', clubId)
      .order('report_date', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    const page = (data ?? []) as ReportingPointRow[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  // Aucune ligne REPORTING → le dashboard V2 reste en mode demo (DSH-012).
  if (rows.length === 0) return null

  const series = deriveMemberSeries(rows, opts.detentionPct, opts.joinedAt)
  // Série vide après filtrage (cutoff joinedAt, points non finis) → même fallback demo.
  if (series.length === 0) return null

  const firstPoint = series[0]
  const lastPoint = series[series.length - 1]

  return {
    source: 'live',
    series,
    variations: {
      d1: computeVariation(series, 1),
      d30: computeVariation(series, 30),
      max: computeVariation(series, 'max'),
    },
    meta: {
      clubId,
      pointCount: series.length,
      firstDate: firstPoint?.date ?? null,
      lastDate: lastPoint?.date ?? null,
      detentionPctUsed: opts.detentionPct,
      // Cutoff réellement appliqué par deriveMemberSeries (null si joinedAt absent/non parseable).
      joinedAtCutoff: normalizeJoinedAtCutoff(opts.joinedAt),
    },
  }
}
