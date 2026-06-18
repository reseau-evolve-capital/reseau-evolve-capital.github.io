import { describe, it, expect } from 'vitest'
import type { NetworkClubRow } from '@evolve/ui'
import { deriveNetworkKpis } from './network'

function club(over: Partial<NetworkClubRow>): NetworkClubRow {
  return {
    id: 'c',
    name: 'Club',
    slug: 'club',
    activeMembersCount: 0,
    aggregatedValuation: null,
    lastSyncedAt: null,
    matrixConnected: false,
    ...over,
  }
}

describe('deriveNetworkKpis — KPIs du bandeau réseau', () => {
  it('aucun club → count 0, membres 0, capital null (pas de delta sur le vide)', () => {
    expect(deriveNetworkKpis([])).toEqual({
      clubsCount: 0,
      totalActiveMembers: 0,
      cumulativeCapital: null,
    })
  })

  it('somme les membres actifs de tous les clubs', () => {
    const kpis = deriveNetworkKpis([
      club({ activeMembersCount: 18 }),
      club({ activeMembersCount: 11 }),
      club({ activeMembersCount: 0 }),
    ])
    expect(kpis.clubsCount).toBe(3)
    expect(kpis.totalActiveMembers).toBe(29)
  })

  it('capital cumulé = somme des valos connues uniquement', () => {
    const kpis = deriveNetworkKpis([
      club({ aggregatedValuation: 642_188.42 }),
      club({ aggregatedValuation: 128_400 }),
      club({ aggregatedValuation: null }), // jamais synchronisé → ignoré
    ])
    expect(kpis.cumulativeCapital).toBeCloseTo(770_588.42, 2)
  })

  it('capital null tant qu’aucun club n’a de valo (jamais NaN/0 trompeur)', () => {
    const kpis = deriveNetworkKpis([
      club({ aggregatedValuation: null }),
      club({ aggregatedValuation: null }),
    ])
    expect(kpis.cumulativeCapital).toBeNull()
  })
})
