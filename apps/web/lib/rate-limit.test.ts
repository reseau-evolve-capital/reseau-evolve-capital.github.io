import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock des deps Upstash : aucun vrai Redis. La factory `Ratelimit` est remplacée par un
// stub dont `limit()` est piloté par les tests. `Redis.fromEnv()` ne doit jamais être appelé
// (le helper court-circuite avant si les env vars manquent) — on le stube quand même par sûreté.
const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  slidingWindow: vi.fn(() => ({ kind: 'sliding' })),
  RatelimitCtor: vi.fn(),
}))

vi.mock('@upstash/ratelimit', () => {
  class Ratelimit {
    static slidingWindow = mocks.slidingWindow
    limit = mocks.limit
    constructor(opts: unknown) {
      mocks.RatelimitCtor(opts)
    }
  }
  return { Ratelimit }
})

vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: () => ({ __redis: true }) },
}))

import { checkRateLimit, rateLimitedResponse, __resetRateLimitState } from './rate-limit'

const ORIGINAL_ENV = { ...process.env }

function withUpstash(): void {
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
}
function withoutUpstash(): void {
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
}

beforeEach(() => {
  mocks.limit.mockReset()
  mocks.slidingWindow.mockClear()
  mocks.RatelimitCtor.mockClear()
  __resetRateLimitState()
  vi.restoreAllMocks()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('checkRateLimit — sous le seuil', () => {
  it('autorise quand Upstash répond success: true', async () => {
    withUpstash()
    mocks.limit.mockResolvedValue({
      success: true,
      reset: Date.now() + 60_000,
      limit: 60,
      remaining: 59,
    })

    const result = await checkRateLimit('marketPrices', 'ip:1.2.3.4')

    expect(result.allowed).toBe(true)
    expect(mocks.limit).toHaveBeenCalledWith('market-prices:ip:1.2.3.4')
  })
})

describe('checkRateLimit — au-dessus du seuil', () => {
  it('refuse (allowed: false) et calcule un Retry-After positif', async () => {
    withUpstash()
    const reset = Date.now() + 42_000
    mocks.limit.mockResolvedValue({ success: false, reset, limit: 60, remaining: 0 })

    const result = await checkRateLimit('marketPrices', 'ip:1.2.3.4')

    expect(result.allowed).toBe(false)
    if (result.allowed) throw new Error('attendu refusé')
    // Retry-After arrondi au-dessus, au moins 1s.
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1)
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(43)
  })

  it('garantit un Retry-After ≥ 1 même si reset est déjà passé', async () => {
    withUpstash()
    mocks.limit.mockResolvedValue({
      success: false,
      reset: Date.now() - 5_000,
      limit: 60,
      remaining: 0,
    })

    const result = await checkRateLimit('marketPrices', 'ip:x')

    expect(result.allowed).toBe(false)
    if (result.allowed) throw new Error('attendu refusé')
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1)
  })
})

describe('checkRateLimit — fail-open sans Upstash', () => {
  it('autorise et log un warning UNE SEULE FOIS quand les env vars manquent', async () => {
    withoutUpstash()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const r1 = await checkRateLimit('marketPrices', 'ip:1')
    const r2 = await checkRateLimit('magicLink', 'ip:2')

    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
    // Jamais d'appel au limiter Upstash.
    expect(mocks.limit).not.toHaveBeenCalled()
    // Warning logué une seule fois malgré deux passages (et deux limiteurs différents).
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('Rate-limit désactivé')
  })

  it('fail-open si limit() lève (panne Upstash) — ne bloque jamais', async () => {
    withUpstash()
    mocks.limit.mockRejectedValue(new Error('redis down'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await checkRateLimit('marketPrices', 'ip:1.2.3.4')

    expect(result.allowed).toBe(true)
    expect(warn).toHaveBeenCalled()
  })
})

describe('limiteurs nommés', () => {
  it('applique les bons seuils/fenêtres par limiteur', async () => {
    withUpstash()
    mocks.limit.mockResolvedValue({
      success: true,
      reset: Date.now() + 1000,
      limit: 1,
      remaining: 0,
    })

    await checkRateLimit('magicLink', 'ip:a')
    await checkRateLimit('sync', 'club:1:user:2')
    await checkRateLimit('marketPrices', 'ip:b')
    await checkRateLimit('attestation', 'user:3')

    // Quatre fenêtres déclarées via slidingWindow(tokens, window).
    expect(mocks.slidingWindow).toHaveBeenCalledWith(5, '10 m')
    expect(mocks.slidingWindow).toHaveBeenCalledWith(1, '5 m')
    expect(mocks.slidingWindow).toHaveBeenCalledWith(60, '1 m')
    expect(mocks.slidingWindow).toHaveBeenCalledWith(30, '5 m')
  })

  it('préfixe les clés par limiteur (isolation des compteurs)', async () => {
    withUpstash()
    mocks.limit.mockResolvedValue({
      success: true,
      reset: Date.now() + 1000,
      limit: 1,
      remaining: 0,
    })

    await checkRateLimit('sync', 'club:1:user:2')

    expect(mocks.limit).toHaveBeenCalledWith('sync:club:1:user:2')
  })
})

describe('rateLimitedResponse', () => {
  it('produit une 429 avec Retry-After et un message FR', async () => {
    const res = rateLimitedResponse(42)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('42')
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/Trop de tentatives/)
  })
})
