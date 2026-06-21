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
  resolveAdminContext,
  ACTIVE_MEMBER_LIMIT,
  computeRecoveryRate,
  computeEncaisse,
  buildRegulariserList,
  buildSyntheseParams,
  buildRelanceMessage,
  type ClubMember,
  type ClubCotisationsStats,
  type MonthStatus,
} from './admin'

const mk = (over: Partial<ClubMember>): ClubMember => ({
  id: 'm1',
  userId: 'u1',
  fullName: 'AAA Alice',
  email: 'alice@x.fr',
  emailIsPlaceholder: false,
  role: 'member',
  roleSource: 'sheet',
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

describe('resolveAdminContext (scope club actif)', () => {
  // Mock minimal et chaînable du query builder Supabase utilisé par resolveAdminContext.
  // Capture le filtre .eq('club_id', …) pour vérifier le scoping au club actif.
  function makeSupabase(maybeSingleData: { club_id: string; role: string } | null) {
    const calls = { clubFilter: undefined as string | undefined }
    const chain = {
      select: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      eq: (col: string, val: unknown) => {
        if (col === 'club_id') calls.clubFilter = val as string
        return chain
      },
      maybeSingle: async () => ({ data: maybeSingleData }),
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { client: { from: () => chain } as any, calls }
  }

  it('scope la résolution au club actif et renvoie le contexte si l’user y est staff', async () => {
    const { client, calls } = makeSupabase({ club_id: 'club-B', role: 'president' })
    const ctx = await resolveAdminContext(client, 'u1', 'club-B')
    expect(ctx).toEqual({ userId: 'u1', clubId: 'club-B', role: 'president' })
    expect(calls.clubFilter).toBe('club-B')
  })

  it('renvoie null si l’user n’est PAS staff dans le club actif (simple membre)', async () => {
    const { client, calls } = makeSupabase(null)
    const ctx = await resolveAdminContext(client, 'u1', 'club-B')
    expect(ctx).toBeNull()
    expect(calls.clubFilter).toBe('club-B')
  })

  it('sans club actif (pas de cookie) : pas de filtre club, club staff le plus récent', async () => {
    const { client, calls } = makeSupabase({ club_id: 'club-A', role: 'treasurer' })
    const ctx = await resolveAdminContext(client, 'u1')
    expect(ctx).toEqual({ userId: 'u1', clubId: 'club-A', role: 'treasurer' })
    expect(calls.clubFilter).toBeUndefined()
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

// ─── Tests cotisations V2 ────────────────────────────────────────────────────

type M = { status: MonthStatus }
type MA = { status: MonthStatus; amount: number }

describe('computeRecoveryRate', () => {
  it('renvoie 1 sur liste vide (aucun mois exploitable)', () => {
    expect(computeRecoveryRate([])).toBe(1)
  })

  it('renvoie 1 si tous les mois sont paid', () => {
    const months: M[] = [{ status: 'paid' }, { status: 'paid' }, { status: 'paid' }]
    expect(computeRecoveryRate(months)).toBe(1)
  })

  it('renvoie 0 si tous les mois sont late', () => {
    const months: M[] = [{ status: 'late' }, { status: 'late' }]
    expect(computeRecoveryRate(months)).toBe(0)
  })

  it('calcule correctement un mélange paid/late/due', () => {
    // 2 paid, 1 late, 1 due → 2/4 = 0.5
    const months: M[] = [
      { status: 'paid' },
      { status: 'paid' },
      { status: 'late' },
      { status: 'due' },
    ]
    expect(computeRecoveryRate(months)).toBe(0.5)
  })

  it('exclut les mois exempt du calcul', () => {
    // 1 paid, 1 exempt (ignoré), 1 late → 1/2 = 0.5
    const months: M[] = [{ status: 'paid' }, { status: 'exempt' }, { status: 'late' }]
    expect(computeRecoveryRate(months)).toBe(0.5)
  })

  it('renvoie 1 si tous les mois sont exempt (aucun exploitable)', () => {
    const months: M[] = [{ status: 'exempt' }, { status: 'exempt' }]
    expect(computeRecoveryRate(months)).toBe(1)
  })

  it('taux fractionnaire précis : 3 paid sur 4 non-exempt', () => {
    const months: M[] = [
      { status: 'paid' },
      { status: 'paid' },
      { status: 'paid' },
      { status: 'late' },
    ]
    expect(computeRecoveryRate(months)).toBeCloseTo(0.75)
  })
})

describe('computeEncaisse', () => {
  it('renvoie 0 sur liste vide', () => {
    expect(computeEncaisse([])).toBe(0)
  })

  it('somme uniquement les mois paid', () => {
    const months: MA[] = [
      { status: 'paid', amount: 150 },
      { status: 'late', amount: 100 },
      { status: 'due', amount: 80 },
      { status: 'exempt', amount: 50 },
    ]
    expect(computeEncaisse(months)).toBe(150)
  })

  it('somme plusieurs mois paid', () => {
    const months: MA[] = [
      { status: 'paid', amount: 200 },
      { status: 'paid', amount: 300 },
      { status: 'late', amount: 100 },
    ]
    expect(computeEncaisse(months)).toBe(500)
  })

  it('renvoie 0 si aucun mois paid', () => {
    const months: MA[] = [
      { status: 'late', amount: 100 },
      { status: 'due', amount: 80 },
    ]
    expect(computeEncaisse(months)).toBe(0)
  })
})

describe('buildRegulariserList', () => {
  const lateMap = new Map<string, number>([
    ['m1', 3],
    ['m2', 1],
  ])

  it('renvoie une liste vide si aucun membre impayé', () => {
    const members = [mk({ id: 'm1', isUnpaid: false })]
    expect(buildRegulariserList(members, lateMap)).toHaveLength(0)
  })

  it('inclut uniquement les membres avec isUnpaid=true', () => {
    const members = [
      mk({ id: 'm1', isUnpaid: true, amountDue: 300 }),
      mk({ id: 'm2', isUnpaid: false, amountDue: 0 }),
    ]
    const result = buildRegulariserList(members, lateMap)
    expect(result).toHaveLength(1)
    expect(result[0]!.membershipId).toBe('m1')
  })

  it('mappe correctement les champs (membershipId, fullName, lateMonthsCount, amountDue, email, emailIsPlaceholder)', () => {
    const members = [
      mk({
        id: 'm1',
        isUnpaid: true,
        fullName: 'Alice',
        amountDue: 300,
        email: 'alice@x.fr',
        emailIsPlaceholder: false,
      }),
    ]
    const result = buildRegulariserList(members, lateMap)
    expect(result[0]).toEqual({
      membershipId: 'm1',
      fullName: 'Alice',
      lateMonthsCount: 3,
      amountDue: 300,
      email: 'alice@x.fr',
      emailIsPlaceholder: false,
    })
  })

  it('lateMonthsCount vaut 0 si absente de la Map', () => {
    const members = [mk({ id: 'unknown', isUnpaid: true, amountDue: 100 })]
    const result = buildRegulariserList(members, lateMap)
    expect(result[0]!.lateMonthsCount).toBe(0)
  })

  it('trie par amountDue décroissant (le plus gros impayé en premier)', () => {
    const members = [
      mk({ id: 'm2', isUnpaid: true, amountDue: 100 }),
      mk({ id: 'm1', isUnpaid: true, amountDue: 300 }),
      mk({ id: 'm3', isUnpaid: true, amountDue: 200 }),
    ]
    const result = buildRegulariserList(members, lateMap)
    expect(result.map((r) => r.membershipId)).toEqual(['m1', 'm3', 'm2'])
  })
})

describe('buildSyntheseParams', () => {
  const baseStats: ClubCotisationsStats = {
    recoveryRate: 0.85,
    lateAmount: 600,
    lateCount: 2,
    encaisse: 3000,
  }

  it('0 retard : topMemberName et topMemberAmount sont null', () => {
    const result = buildSyntheseParams({ ...baseStats, lateCount: 0, lateAmount: 0 }, [])
    expect(result.topMemberName).toBeNull()
    expect(result.topMemberAmount).toBeNull()
    expect(result.lateCount).toBe(0)
  })

  it('1 retard : remonte le nom et le montant du seul membre', () => {
    const regulariserList = [
      {
        membershipId: 'm1',
        fullName: 'Alice',
        lateMonthsCount: 2,
        amountDue: 300,
        email: 'alice@example.com',
        emailIsPlaceholder: false,
      },
    ]
    const result = buildSyntheseParams(baseStats, regulariserList)
    expect(result.topMemberName).toBe('Alice')
    expect(result.topMemberAmount).toBe(300)
    expect(result.lateCount).toBe(2)
    expect(result.lateAmount).toBe(600)
    expect(result.recoveryRate).toBe(0.85)
  })

  it('N retards : remonte le 1er (montant le plus élevé, liste déjà triée)', () => {
    const regulariserList = [
      {
        membershipId: 'm1',
        fullName: 'Bob',
        lateMonthsCount: 3,
        amountDue: 500,
        email: 'bob@example.com',
        emailIsPlaceholder: false,
      },
      {
        membershipId: 'm2',
        fullName: 'Alice',
        lateMonthsCount: 1,
        amountDue: 200,
        email: 'alice@example.com',
        emailIsPlaceholder: false,
      },
    ]
    const result = buildSyntheseParams(baseStats, regulariserList)
    expect(result.topMemberName).toBe('Bob')
    expect(result.topMemberAmount).toBe(500)
  })
})

describe('buildRelanceMessage', () => {
  it('inclut le nom du membre', () => {
    const msg = buildRelanceMessage({
      memberName: 'Alice',
      lateMonthLabels: ['janvier 2024'],
      amountDue: 150,
      currency: 'EUR',
    })
    expect(msg).toContain('Alice')
  })

  it('liste les mois en retard quand fournis', () => {
    const msg = buildRelanceMessage({
      memberName: 'Bob',
      lateMonthLabels: ['janvier 2024', 'février 2024'],
      amountDue: 300,
      currency: 'EUR',
    })
    expect(msg).toContain('janvier 2024')
    expect(msg).toContain('février 2024')
  })

  it('affiche le montant formaté en EUR', () => {
    const msg = buildRelanceMessage({
      memberName: 'Alice',
      lateMonthLabels: ['mars 2024'],
      amountDue: 150,
      currency: 'EUR',
    })
    // Intl.NumberFormat fr-FR formate 150 EUR → '150,00 €'
    expect(msg).toContain('150')
  })

  it('liste vide : affiche la variante sans mois', () => {
    const msg = buildRelanceMessage({
      memberName: 'Carol',
      lateMonthLabels: [],
      amountDue: 0,
      currency: 'EUR',
    })
    expect(msg).toContain('Carol')
    expect(msg).toContain('impayé')
  })

  it('mois unique : ne contient pas de virgule de liste', () => {
    const msg = buildRelanceMessage({
      memberName: 'Dave',
      lateMonthLabels: ['avril 2024'],
      amountDue: 100,
      currency: 'EUR',
    })
    expect(msg).toContain('avril 2024')
    // Un seul mois → pas de virgule dans la partie "Mois concernés"
    expect(msg).not.toContain('avril 2024,')
  })
})
