import { afterEach, describe, expect, it, vi } from 'vitest'

// `import 'server-only'` jette hors d'un module React Server : neutralisé pour Vitest (node).
vi.mock('server-only', () => ({}))

import { DASHBOARD_VARIANT_COOKIE, getDashboardVariant, hashBucket } from './dashboard-v2'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('hashBucket', () => {
  it('retourne un entier 0..99 pour des userIds variés', () => {
    const ids = ['', 'a', 'user-1', '550e8400-e29b-41d4-a716-446655440000', 'membre@club.fr']
    for (const id of ids) {
      const bucket = hashBucket(id)
      expect(Number.isInteger(bucket)).toBe(true)
      expect(bucket).toBeGreaterThanOrEqual(0)
      expect(bucket).toBeLessThanOrEqual(99)
    }
  })

  it('est déterministe (même userId → même bucket ×100)', () => {
    const first = hashBucket('user-42')
    for (let i = 0; i < 100; i++) {
      expect(hashBucket('user-42')).toBe(first)
    }
  })
})

describe('getDashboardVariant — précédence env > cookie > hash', () => {
  it("l'env DASHBOARD_V2_FORCE prime sur le cookie et le rollout", () => {
    vi.stubEnv('DASHBOARD_V2_FORCE', 'v1')
    vi.stubEnv('DASHBOARD_V2_ROLLOUT', '100')
    expect(getDashboardVariant('user-1', 'v2')).toBe('v1')

    vi.stubEnv('DASHBOARD_V2_FORCE', 'v2')
    vi.stubEnv('DASHBOARD_V2_ROLLOUT', '0')
    expect(getDashboardVariant('user-1', 'v1')).toBe('v2')
  })

  it('une valeur DASHBOARD_V2_FORCE invalide est ignorée silencieusement', () => {
    vi.stubEnv('DASHBOARD_V2_FORCE', 'yes')
    vi.stubEnv('DASHBOARD_V2_ROLLOUT', '100')
    expect(getDashboardVariant('user-1', null)).toBe('v2')
  })

  it('le cookie validé prime sur le bucket', () => {
    vi.stubEnv('DASHBOARD_V2_ROLLOUT', '0')
    expect(getDashboardVariant('user-1', 'v2')).toBe('v2')
    vi.stubEnv('DASHBOARD_V2_ROLLOUT', '100')
    expect(getDashboardVariant('user-1', 'v1')).toBe('v1')
  })

  it('un cookie invalide est ignoré silencieusement (retombe sur le bucket)', () => {
    vi.stubEnv('DASHBOARD_V2_ROLLOUT', '100')
    expect(getDashboardVariant('user-1', 'lol')).toBe('v2')
    vi.stubEnv('DASHBOARD_V2_ROLLOUT', '0')
    expect(getDashboardVariant('user-1', 'lol')).toBe('v1')
  })
})

describe('getDashboardVariant — rollout', () => {
  const userIds = Array.from({ length: 1000 }, (_, i) => `user-synthetique-${i}`)

  it('rollout absent → défaut 0 → toujours v1 (fail-safe)', () => {
    for (const id of userIds.slice(0, 100)) {
      expect(getDashboardVariant(id, null)).toBe('v1')
    }
  })

  it('rollout 0 → toujours v1', () => {
    vi.stubEnv('DASHBOARD_V2_ROLLOUT', '0')
    for (const id of userIds.slice(0, 100)) {
      expect(getDashboardVariant(id, null)).toBe('v1')
    }
  })

  it('rollout 100 → toujours v2', () => {
    vi.stubEnv('DASHBOARD_V2_ROLLOUT', '100')
    for (const id of userIds.slice(0, 100)) {
      expect(getDashboardVariant(id, null)).toBe('v2')
    }
  })

  it('rollout invalide ou hors bornes → clampé (NaN → 0, 150 → 100, -5 → 0)', () => {
    vi.stubEnv('DASHBOARD_V2_ROLLOUT', 'abc')
    expect(getDashboardVariant('user-1', null)).toBe('v1')
    vi.stubEnv('DASHBOARD_V2_ROLLOUT', '150')
    expect(getDashboardVariant('user-1', null)).toBe('v2')
    vi.stubEnv('DASHBOARD_V2_ROLLOUT', '-5')
    expect(getDashboardVariant('user-1', null)).toBe('v1')
  })

  it('est stable : même userId → même variante ×100 (rollout 50)', () => {
    vi.stubEnv('DASHBOARD_V2_ROLLOUT', '50')
    const first = getDashboardVariant('user-stable', null)
    for (let i = 0; i < 100; i++) {
      expect(getDashboardVariant('user-stable', null)).toBe(first)
    }
  })

  it('distribue ~50/50 sur 1000 userIds synthétiques à rollout 50 (±10 pts)', () => {
    vi.stubEnv('DASHBOARD_V2_ROLLOUT', '50')
    const v2Count = userIds.filter((id) => getDashboardVariant(id, null) === 'v2').length
    expect(v2Count).toBeGreaterThanOrEqual(400)
    expect(v2Count).toBeLessThanOrEqual(600)
  })
})

describe('DASHBOARD_VARIANT_COOKIE', () => {
  it('expose le nom de cookie attendu par la QA / les specs e2e', () => {
    expect(DASHBOARD_VARIANT_COOKIE).toBe('ec_dashboard_variant')
  })
})
