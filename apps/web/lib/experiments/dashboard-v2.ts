// Expérience A/B « Dashboard V2 » — affectation de variante côté serveur (RSC).
//
// Précédence (du plus fort au plus faible) :
//   1. env `DASHBOARD_V2_FORCE` ∈ {'v1','v2'} — kill-switch / dev (valeur invalide ignorée) ;
//   2. cookie `ec_dashboard_variant` ∈ {'v1','v2'} — LECTURE SEULE (jamais écrit par l'app,
//      posé manuellement par la QA / les specs e2e pour figer une variante) ;
//   3. bucket déterministe : `hashBucket(userId) < rollout` → 'v2', avec
//      rollout = `DASHBOARD_V2_ROLLOUT` clampé 0..100 (défaut 100 = V2 pour tous,
//      rollout 100 % acté par l'owner le 2026-06-12). Le fail-safe est inversé :
//      poser `DASHBOARD_V2_ROLLOUT=0` (ou `DASHBOARD_V2_FORCE=v1` / cookie v1)
//      ramène tout le monde en V1 — la mécanique A/B reste intacte.
//
// Déterminisme pur : FNV-1a sur l'userId, AUCUN Math.random / Date.now — un même membre
// voit toujours la même variante tant que le rollout ne change pas.

import 'server-only'

export type DashboardVariant = 'v1' | 'v2'

export const DASHBOARD_VARIANT_COOKIE = 'ec_dashboard_variant'

function isVariant(value: unknown): value is DashboardVariant {
  return value === 'v1' || value === 'v2'
}

/** Hash FNV-1a 32 bits de l'userId, réduit en bucket 0..99. Pur et déterministe. */
export function hashBucket(userId: string): number {
  let hash = 0x811c9dc5 // offset basis FNV-1a 32 bits
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) // prime FNV 32 bits
  }
  return (hash >>> 0) % 100
}

/** Pourcentage de rollout V2, lu de l'env et clampé 0..100.
 *  Absent ou VIDE → 100 (V2 par défaut — `.env.example` shippe `DASHBOARD_V2_ROLLOUT=`,
 *  la ligne vide vaut donc « non posé ») ; valeur posée mais invalide → 0 (repli prudent V1). */
function rolloutPct(): number {
  const raw = process.env.DASHBOARD_V2_ROLLOUT?.trim()
  if (!raw) return 100
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(100, Math.max(0, parsed))
}

/** Résout la variante dashboard du membre. Cf. précédence documentée en tête de fichier. */
export function getDashboardVariant(userId: string, cookieValue?: string | null): DashboardVariant {
  const force = process.env.DASHBOARD_V2_FORCE
  if (isVariant(force)) return force
  if (isVariant(cookieValue)) return cookieValue
  return hashBucket(userId) < rolloutPct() ? 'v2' : 'v1'
}
