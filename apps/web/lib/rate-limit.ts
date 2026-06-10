// Helper de rate-limit partagé (OPS-005) — consolide la logique jadis dupliquée inline dans
// chaque route API. Backend : Upstash Redis + sliding window.
//
// Principes (inchangés vs l'implémentation inline d'origine) :
//   - Init PARESSEUSE : on ne construit jamais le client Redis au niveau module, car
//     `Redis.fromEnv()` lève à l'import quand les variables Upstash sont absentes (ce qui
//     casserait `next build` et le dev/CI sans Upstash).
//   - FAIL-OPEN : un limiteur non configuré (dev/CI sans Upstash) OU une panne Upstash
//     (réseau, quota) NE DOIT JAMAIS bloquer une requête légitime. On autorise et on log un
//     avertissement une seule fois par process.
//   - Réponse 429 cohérente avec un header `Retry-After` (secondes) dérivé du `reset` Upstash.
//
// Réf : ARCHITECTURE.md §8 (env), CLAUDE.md (sécurité), docs/security/rate-limiting.md.

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

/** Limiteurs nommés : un préfixe de clé + un sliding window (tokens, fenêtre) par endpoint. */
interface LimiterConfig {
  /** Préfixe ajouté à la clé d'appel — isole les compteurs entre endpoints partageant une clé. */
  readonly prefix: string
  /** Nombre de requêtes autorisées dans la fenêtre. */
  readonly tokens: number
  /** Durée de la fenêtre glissante (syntaxe Upstash : « 10 m », « 1 m », « 5 m »…). */
  readonly window: Parameters<typeof Ratelimit.slidingWindow>[1]
}

// Source unique des seuils. Modifier ici = modifier le tableau de docs/security/rate-limiting.md.
const LIMITERS = {
  // POST /api/auth/magic-link — 5 req / 10 min par IP (anti-spam d'envoi de liens).
  magicLink: { prefix: 'magic-link', tokens: 5, window: '10 m' },
  // POST /api/sync — 1 req / 5 min par couple (club, user) (sync coûteuse, anti-rafale).
  sync: { prefix: 'sync', tokens: 1, window: '5 m' },
  // GET /api/market-prices — 60 req / min par IP (lecture fréquente, protège le quota provider).
  marketPrices: { prefix: 'market-prices', tokens: 60, window: '1 m' },
  // GET /api/attestation/detention — 30 req / 5 min par user (génération PDF coûteuse, route authentifiée).
  attestation: { prefix: 'attestation', tokens: 30, window: '5 m' },
  // POST /api/auth/handoff-link — 10 req / 5 min par user (mint de liens de connexion portables, route authentifiée).
  handoff: { prefix: 'handoff', tokens: 10, window: '5 m' },
} as const satisfies Record<string, LimiterConfig>

export type RateLimitName = keyof typeof LIMITERS

/** Résultat d'un contrôle : autorisé, ou refusé avec un délai de réessai (secondes). */
export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number }

// Cache des instances Ratelimit par nom (init paresseuse, partagée sur la durée du process).
const instances = new Map<RateLimitName, Ratelimit>()
let warned = false

/** Vrai si les deux variables Upstash sont présentes. */
function upstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

/** Log l'avertissement de fail-open une seule fois par process (évite le bruit en dev/CI). */
function warnOnce(): void {
  if (warned) return
  warned = true
  console.warn('Rate-limit désactivé : variables Upstash absentes.')
}

/** Récupère (ou construit paresseusement) l'instance Ratelimit pour un limiteur nommé. */
function getLimiter(name: RateLimitName): Ratelimit {
  let limiter = instances.get(name)
  if (!limiter) {
    const cfg = LIMITERS[name]
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(cfg.tokens, cfg.window),
    })
    instances.set(name, limiter)
  }
  return limiter
}

/**
 * Vérifie le quota d'un limiteur nommé pour une clé donnée (IP, user id, ou couple).
 *
 * Fail-open : retourne toujours `{ allowed: true }` si Upstash n'est pas configuré ou si l'appel
 * échoue (un défaut d'infra ne dégrade jamais le service). N'invoque jamais Redis dans ce cas.
 */
export async function checkRateLimit(name: RateLimitName, key: string): Promise<RateLimitResult> {
  if (!upstashConfigured()) {
    warnOnce()
    return { allowed: true }
  }
  try {
    const { success, reset } = await getLimiter(name).limit(`${LIMITERS[name].prefix}:${key}`)
    if (success) return { allowed: true }
    // `reset` est un timestamp Unix en ms. On en dérive un Retry-After en secondes, ≥ 1.
    const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    return { allowed: false, retryAfterSeconds }
  } catch (err) {
    // Panne Upstash (réseau, quota, token invalide) → fail-open. On ne bloque jamais un appel légitime.
    warned = true
    console.warn('Rate-limit ignoré : échec du backend Upstash (fail-open).', err)
    return { allowed: true }
  }
}

/** Réponse 429 standard (message FR + header Retry-After en secondes). */
export function rateLimitedResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: 'Trop de tentatives. Réessaie dans quelques minutes.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  )
}

/** Réinitialise l'état interne (cache + flag warning). RÉSERVÉ AUX TESTS. */
export function __resetRateLimitState(): void {
  instances.clear()
  warned = false
}
