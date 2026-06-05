import { describe, it, expect } from 'vitest'
import {
  isUnpaid,
  countUnpaid,
  clubTotalContributed,
  displayableEmail,
  sortMembers,
  filterMembers,
  filterByMemberState,
  countActiveMembers,
  computeContribStats,
  isStaffRole,
  ACTIVE_MEMBER_LIMIT,
  type ClubMember,
} from './admin'

const mk = (over: Partial<ClubMember>): ClubMember => ({
  id: 'm1',
  userId: 'u1',
  fullName: 'AAA Alice',
  email: 'alice@x.fr',
  emailIsPlaceholder: false,
  role: 'member',
  totalContributed: 1000,
  detentionPct: 0.1,
  monthsCount: 10,
  netMarketValue: 5000,
  status: 'ok',
  amountDue: 0,
  isUnpaid: false,
  isActive: true,
  membershipStatus: 'active',
  leaveAt: null,
  accessStatus: 'active',
  ...over,
})

describe('isUnpaid', () => {
  it('vrai si status late', () => {
    expect(isUnpaid('late', 0)).toBe(true)
  })
  it('vrai si status pending', () => {
    expect(isUnpaid('pending', 0)).toBe(true)
  })
  it('vrai si amount_due > 0 même en ok', () => {
    expect(isUnpaid('ok', 50)).toBe(true)
  })
  it('faux si ok et amount_due 0', () => {
    expect(isUnpaid('ok', 0)).toBe(false)
  })
  it('faux si exempt sans montant dû', () => {
    expect(isUnpaid('exempt', 0)).toBe(false)
  })
  it('faux si status null sans montant', () => {
    expect(isUnpaid(null, 0)).toBe(false)
  })
})

describe('countUnpaid', () => {
  it('compte les membres en impayé', () => {
    const members = [mk({ isUnpaid: true }), mk({ isUnpaid: false }), mk({ isUnpaid: true })]
    expect(countUnpaid(members)).toBe(2)
  })
  it('renvoie 0 sur liste vide', () => {
    expect(countUnpaid([])).toBe(0)
  })
})

describe('displayableEmail', () => {
  it('renvoie l’email réel quand ce n’est pas un placeholder', () => {
    expect(displayableEmail('alice@x.fr', false)).toBe('alice@x.fr')
  })
  it('renvoie null quand l’email est un placeholder (à masquer)', () => {
    expect(displayableEmail('sans-email.alice@club.local', true)).toBeNull()
  })
})

describe('clubTotalContributed', () => {
  it('somme les totaux', () => {
    expect(
      clubTotalContributed([mk({ totalContributed: 1000 }), mk({ totalContributed: 500 })])
    ).toBe(1500)
  })
  it('renvoie 0 sur liste vide', () => {
    expect(clubTotalContributed([])).toBe(0)
  })
})

describe('filterMembers', () => {
  it('ne garde que les impayés quand onlyUnpaid', () => {
    const members = [mk({ id: 'a', isUnpaid: true }), mk({ id: 'b', isUnpaid: false })]
    expect(filterMembers(members, true).map((m) => m.id)).toEqual(['a'])
  })
  it('renvoie tout quand onlyUnpaid=false', () => {
    const members = [mk({ id: 'a', isUnpaid: true }), mk({ id: 'b' })]
    expect(filterMembers(members, false)).toHaveLength(2)
  })
})

describe('filterByMemberState', () => {
  const active = mk({ id: 'a', membershipStatus: 'active' })
  const left = mk({ id: 'b', membershipStatus: 'left', leaveAt: '2023-12-31' })
  it('« all » renvoie actifs ET sortis', () => {
    expect(filterByMemberState([active, left], 'all').map((m) => m.id)).toEqual(['a', 'b'])
  })
  it('« active » ne garde que les actifs', () => {
    expect(filterByMemberState([active, left], 'active').map((m) => m.id)).toEqual(['a'])
  })
  it('« left » ne garde que les sortis', () => {
    expect(filterByMemberState([active, left], 'left').map((m) => m.id)).toEqual(['b'])
  })
})

describe('countActiveMembers', () => {
  it('compte les membres au statut d’adhésion active', () => {
    const members = [
      mk({ membershipStatus: 'active' }),
      mk({ membershipStatus: 'left' }),
      mk({ membershipStatus: 'active' }),
    ]
    expect(countActiveMembers(members)).toBe(2)
  })
  it('un membre sorti ne compte jamais comme actif', () => {
    expect(countActiveMembers([mk({ membershipStatus: 'left', leaveAt: '2024-01-01' })])).toBe(0)
  })
  it('renvoie 0 sur liste vide', () => {
    expect(countActiveMembers([])).toBe(0)
  })
  it('la limite légale est de 20', () => {
    expect(ACTIVE_MEMBER_LIMIT).toBe(20)
  })
})

describe('sortMembers', () => {
  const a = mk({ id: 'a', fullName: 'ZZZ Zoe', totalContributed: 100 })
  const b = mk({ id: 'b', fullName: 'AAA Alice', totalContributed: 900 })
  it('trie par nom asc (locale FR, insensible casse)', () => {
    expect(sortMembers([a, b], 'name', 'asc').map((m) => m.id)).toEqual(['b', 'a'])
  })
  it('trie par total desc', () => {
    expect(sortMembers([a, b], 'total', 'desc').map((m) => m.id)).toEqual(['b', 'a'])
  })
  it('ne mute pas le tableau source', () => {
    const src = [a, b]
    sortMembers(src, 'name', 'asc')
    expect(src.map((m) => m.id)).toEqual(['a', 'b'])
  })
  it('trie par detention asc', () => {
    const x = mk({ id: 'x', detentionPct: 0.05 })
    const y = mk({ id: 'y', detentionPct: 0.25 })
    expect(sortMembers([y, x], 'detention', 'asc').map((m) => m.id)).toEqual(['x', 'y'])
  })
  it('trie par months desc', () => {
    const x = mk({ id: 'x', monthsCount: 3 })
    const y = mk({ id: 'y', monthsCount: 12 })
    expect(sortMembers([x, y], 'months', 'desc').map((m) => m.id)).toEqual(['y', 'x'])
  })
})

describe('isStaffRole', () => {
  it('vrai pour treasurer', () => {
    expect(isStaffRole('treasurer')).toBe(true)
  })
  it('faux pour member', () => {
    expect(isStaffRole('member')).toBe(false)
  })
  it('faux pour null', () => {
    expect(isStaffRole(null)).toBe(false)
  })
})

describe('computeContribStats', () => {
  it('total, count, moyenne sur des montants', () => {
    expect(computeContribStats([100, 200, 300])).toEqual({ total: 600, count: 3, average: 200 })
  })
  it('moyenne 0 sur liste vide (jamais NaN)', () => {
    expect(computeContribStats([])).toEqual({ total: 0, count: 0, average: 0 })
  })
})
