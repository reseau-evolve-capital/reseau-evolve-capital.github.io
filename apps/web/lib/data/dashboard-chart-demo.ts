// Séries DEMO du graphe « Évolution » (Dashboard V2) — données ILLUSTRATIVES, pas de
// source historique réelle en V0 (la DB ne stocke pas de snapshots quotidiens).
//
// Déterminisme STRICT : PRNG mulberry32 seedé par des constantes dérivées de la période
// (master quotidien partagé 7J/30J/90J/1A + master mensuel pour MAX) — JAMAIS de
// Math.random ni Date.now. Mêmes entrées (period, anchorISO, finalValue) → mêmes points.
//
// Forme : tendance haussière douce + ondulations, ancrée sur la quote-part RÉELLE du
// membre (le dernier point VAUT finalValue). Cibles design : 30J ≈ +4,55 %,
// MAX (mensuel depuis 2018-01) ≈ +178 %. 7J = queue des 30J ; 90J/1A = tranches de la
// même marche quotidienne seedée (générée en entier puis découpée).

import type { EvolutionPeriod, EvolutionPoint } from '@evolve/ui'

export interface DemoEvolutionSeries {
  points: EvolutionPoint[]
  /** Variation premier → dernier point, en euros arrondis (ex. +2854). */
  deltaEur: number
  /** Variation premier → dernier point, en % (ex. 4.55 — pas une fraction). */
  deltaPct: number
}

const DAY_MS = 86_400_000
/** Croissance cible par borne de tranche quotidienne (daysBack → valeur_finale / valeur). */
const DAILY_GROWTH_CONTROLS: Array<[daysBack: number, growth: number]> = [
  [364, 1.21], // 1A ≈ +21 %
  [89, 1.092], // 90J ≈ +9,2 %
  [29, 1.0455], // 30J ≈ +4,55 % (cible design)
  [6, 1.018], // 7J ≈ +1,8 %
  [0, 1],
]
const MAX_TOTAL_GROWTH = 2.78 // MAX ≈ +178 % depuis 2018-01
const DAILY_POINTS = 365
const PERIOD_SLICE: Record<Exclude<EvolutionPeriod, 'max'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': DAILY_POINTS,
}

/** PRNG déterministe (mulberry32) — flux reproductible pour une même seed. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Hash FNV-1a 32 bits → seed entière, pour dériver une seed constante d'un libellé. */
function hashSeed(label: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < label.length; i++) {
    hash ^= label.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Jamais de NaN/négatif à l'écran : valeur d'ancrage assainie (invalide → 0). */
function safeFinal(finalValue: number): number {
  return Number.isFinite(finalValue) && finalValue > 0 ? finalValue : 0
}

/** Date d'ancrage assainie (UTC). anchorISO invalide → 1er janvier 2026 (déterministe). */
function safeAnchor(anchorISO: string): Date {
  const d = new Date(anchorISO)
  return Number.isNaN(d.getTime()) ? new Date(Date.UTC(2026, 0, 1)) : d
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Croissance-cible (valeur_finale / valeur) à daysBack, interpolée log-linéairement. */
function dailyGrowthAt(daysBack: number): number {
  const controls = DAILY_GROWTH_CONTROLS
  const first = controls[0]
  if (first && daysBack >= first[0]) return first[1]
  for (let i = 0; i < controls.length - 1; i++) {
    const hi = controls[i]
    const lo = controls[i + 1]
    if (!hi || !lo) continue
    if (daysBack <= hi[0] && daysBack >= lo[0]) {
      const span = hi[0] - lo[0]
      const ratio = span === 0 ? 0 : (daysBack - lo[0]) / span
      return Math.exp(Math.log(lo[1]) + ratio * (Math.log(hi[1]) - Math.log(lo[1])))
    }
  }
  return 1
}

/** Marche quotidienne complète (365 points, dernier = anchor) — partagée 7J/30J/90J/1A. */
function buildDailyMaster(anchor: Date, finalValue: number): EvolutionPoint[] {
  const rng = mulberry32(hashSeed('evolve-dashboard-demo-daily'))
  const phase = rng() * Math.PI * 2
  const points: EvolutionPoint[] = []
  for (let i = 0; i < DAILY_POINTS; i++) {
    const daysBack = DAILY_POINTS - 1 - i
    const base = finalValue / dailyGrowthAt(daysBack)
    // Ondulation douce (sinus) + bruit seedé, amortis vers 0 au point final (exact).
    const damp = Math.min(1, daysBack / 3)
    const wiggle = (0.005 * Math.sin(i / 7 + phase) + (rng() * 2 - 1) * 0.004) * damp
    const value = daysBack === 0 ? finalValue : base * (1 + wiggle)
    points.push({
      date: isoDay(new Date(anchor.getTime() - daysBack * DAY_MS)),
      value: Math.max(0, value),
    })
  }
  return points
}

/** Marche mensuelle depuis 2018-01 (dernier point = anchor) — période MAX, ≈ +178 %. */
function buildMonthlyMaster(anchor: Date, finalValue: number): EvolutionPoint[] {
  const rng = mulberry32(hashSeed('evolve-dashboard-demo-max'))
  const phase = rng() * Math.PI * 2
  const monthsSpan = Math.max(
    1,
    (anchor.getUTCFullYear() - 2018) * 12 + anchor.getUTCMonth() // 2018-01 → mois d'anchor
  )
  const count = monthsSpan + 1
  const firstValue = finalValue / MAX_TOTAL_GROWTH
  const points: EvolutionPoint[] = []
  for (let i = 0; i < count; i++) {
    const last = i === count - 1
    const ratio = i / (count - 1)
    const base = firstValue * Math.exp(ratio * Math.log(MAX_TOTAL_GROWTH))
    // Enveloppe sinus : bruit nul aux extrémités (premier et dernier points exacts).
    const envelope = Math.sin(Math.PI * ratio)
    const wiggle = (0.02 * Math.sin(i / 4 + phase) + (rng() * 2 - 1) * 0.012) * envelope
    points.push({
      // 1er du mois i depuis 2018-01 (Date.UTC normalise le débordement de mois) ; le
      // dernier point porte la date d'anchor elle-même.
      date: last ? isoDay(anchor) : isoDay(new Date(Date.UTC(2018, i, 1))),
      value: last ? finalValue : Math.max(0, base * (1 + wiggle)),
    })
  }
  return points
}

/** Deltas premier → dernier point, arrondis proprement (€ entiers, % à 2 décimales). */
function computeDeltas(points: EvolutionPoint[]): { deltaEur: number; deltaPct: number } {
  const first = points[0]?.value ?? 0
  const last = points[points.length - 1]?.value ?? 0
  const deltaEur = Math.round(last - first)
  const deltaPct = first > 0 ? Math.round(((last - first) / first) * 10000) / 100 : 0
  return { deltaEur, deltaPct }
}

/**
 * Série DEMO d'évolution de la quote-part pour une période donnée.
 * `anchorISO` = date du dernier point ; `finalValue` = quote-part réelle du membre
 * (le dernier point VAUT exactement `finalValue`).
 */
export function getDemoEvolutionSeries(
  period: EvolutionPeriod,
  anchorISO: string,
  finalValue: number
): DemoEvolutionSeries {
  const anchor = safeAnchor(anchorISO)
  const value = safeFinal(finalValue)
  const points =
    period === 'max'
      ? buildMonthlyMaster(anchor, value)
      : buildDailyMaster(anchor, value).slice(-PERIOD_SLICE[period])
  return { points, ...computeDeltas(points) }
}

/**
 * Variation DEMO « depuis hier » du hero (≈ +1,2 % / +773 € à l'échelle de la quote-part).
 * Déterministe par jour d'ancrage (seed dérivée de la date, pas de Date.now).
 */
export function getDemoVariation1d(
  anchorISO: string,
  finalValue: number
): { percent: number; amount: number } {
  const anchor = safeAnchor(anchorISO)
  const rng = mulberry32(hashSeed(`evolve-dashboard-demo-1d-${isoDay(anchor)}`))
  const percent = Math.round((0.9 + rng() * 0.6) * 100) / 100 // 0,90 %..1,50 % — ≈ +1,2 %
  const value = safeFinal(finalValue)
  const amount = Math.round(value - value / (1 + percent / 100))
  return { percent, amount }
}
