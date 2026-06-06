import { describe, it, expect } from 'vitest'
import { mapCotisationsRows } from '../cotisations.mapper'
import type { CotisationsRowDTO, MembershipLookup } from '../../../types/sheets'

const CLUB = '11111111-1111-1111-1111-111111111111'
const MEMBERSHIPS: MembershipLookup[] = [
  { id: 'm-1', user_id: 'u-1', full_name: 'AFOUDAH Ruben' },
  { id: 'm-2', user_id: 'u-2', full_name: 'DIALLO Mamadou' },
]

function makeRow(overrides: Partial<CotisationsRowDTO> = {}): CotisationsRowDTO {
  return {
    fullName: 'AFOUDAH Ruben',
    monthsCount: 12,
    detentionPct: 8.5,
    penalties: 0,
    totalContributed: 1200,
    netMarketValue: 1500,
    status: 'À jour',
    amountDue: 0,
    ...overrides,
  }
}

describe('mapCotisationsRows', () => {
  it('membre matché → contribution avec membership_id', () => {
    const { contributions, unmatched } = mapCotisationsRows([makeRow()], CLUB, MEMBERSHIPS)
    expect(contributions).toHaveLength(1)
    expect(contributions[0]!.membership_id).toBe('m-1')
    expect(contributions[0]!.club_id).toBe(CLUB)
    expect(unmatched).toHaveLength(0)
  })

  it('matching strict insensible à la casse', () => {
    const { contributions } = mapCotisationsRows(
      [makeRow({ fullName: '  afoudah ruben  ' })],
      CLUB,
      MEMBERSHIPS
    )
    expect(contributions[0]!.membership_id).toBe('m-1')
  })

  it('nom inconnu → unmatched, pas de throw', () => {
    const { contributions, unmatched } = mapCotisationsRows(
      [makeRow({ fullName: 'INCONNU Personne' })],
      CLUB,
      MEMBERSHIPS
    )
    expect(contributions).toHaveLength(0)
    expect(unmatched).toContain('INCONNU Personne')
  })

  it('mappe les statuts FR/EN + libellés réels de la matrice', () => {
    const cases: Array<[string, string]> = [
      // Libellés RÉELS de la feuille Cotisations (col 7)
      ['Situation régulière', 'ok'],
      ['Situation irrégulière', 'late'],
      ['situation reguliere', 'ok'], // sans accent
      ['SITUATION IRRÉGULIÈRE', 'late'], // casse haute
      // Rétro-compat libellés historiques
      ['À jour', 'ok'],
      ['ok', 'ok'],
      ['retard', 'late'],
      ['en retard', 'late'],
      ['exempt', 'exempt'],
      ['exempté', 'exempt'],
      ['nimporte', 'pending'],
    ]
    for (const [input, expected] of cases) {
      const { contributions } = mapCotisationsRows([makeRow({ status: input })], CLUB, MEMBERSHIPS)
      expect(contributions[0]!.status).toBe(expected)
    }
  })

  it('"irrégulière" matché avant "régulière" (sous-chaîne) → late', () => {
    const { contributions } = mapCotisationsRows(
      [makeRow({ status: 'Situation irrégulière' })],
      CLUB,
      MEMBERSHIPS
    )
    expect(contributions[0]!.status).toBe('late')
  })

  it('"#ERROR!" → pending + collecté dans unknownStatuses, jamais de throw', () => {
    let res!: ReturnType<typeof mapCotisationsRows>
    expect(() => {
      res = mapCotisationsRows([makeRow({ status: '#ERROR!' })], CLUB, MEMBERSHIPS)
    }).not.toThrow()
    expect(res.contributions[0]!.status).toBe('pending')
    expect(res.unknownStatuses).toContain('#ERROR!')
  })

  it('statut accentué "exempté" → exempt', () => {
    const { contributions } = mapCotisationsRows(
      [makeRow({ status: 'exempté' })],
      CLUB,
      MEMBERSHIPS
    )
    expect(contributions[0]!.status).toBe('exempt')
  })

  it('statut inconnu non vide → pending + collecté dans unknownStatuses', () => {
    const { contributions, unknownStatuses } = mapCotisationsRows(
      [makeRow({ status: 'Statut bizarre' })],
      CLUB,
      MEMBERSHIPS
    )
    expect(contributions[0]!.status).toBe('pending')
    expect(unknownStatuses).toContain('Statut bizarre')
  })

  it('statut vide → pending sans signalement dans unknownStatuses', () => {
    const { contributions, unknownStatuses } = mapCotisationsRows(
      [makeRow({ status: '' })],
      CLUB,
      MEMBERSHIPS
    )
    expect(contributions[0]!.status).toBe('pending')
    expect(unknownStatuses).not.toContain('')
    expect(unknownStatuses).toHaveLength(0)
  })

  it('detention_pct : pourcentage de la feuille → fraction 0..1 (÷100)', () => {
    // La feuille fournit "8,99%" → toNumOrNull = 8.99 (côté parser/DTO).
    const { contributions } = mapCotisationsRows(
      [makeRow({ detentionPct: 8.99 })],
      CLUB,
      MEMBERSHIPS
    )
    expect(contributions[0]!.detention_pct).toBeCloseTo(0.0899, 6)
  })

  it('detention_pct null → 0 (pas de NaN)', () => {
    const { contributions } = mapCotisationsRows(
      [makeRow({ detentionPct: null })],
      CLUB,
      MEMBERSHIPS
    )
    expect(contributions[0]!.detention_pct).toBe(0)
  })

  it('ligne "TOTAUX" → non matchée (unmatched), jamais émise en contribution', () => {
    const { contributions, unmatched } = mapCotisationsRows(
      [makeRow({ fullName: 'TOTAUX' })],
      CLUB,
      MEMBERSHIPS
    )
    expect(contributions).toHaveLength(0)
    expect(unmatched).toContain('TOTAUX')
  })

  it('valeurs numériques null → 0 (sauf net_market_value)', () => {
    const { contributions } = mapCotisationsRows(
      [
        makeRow({
          monthsCount: null,
          detentionPct: null,
          totalContributed: null,
          penalties: null,
          amountDue: null,
          netMarketValue: null,
        }),
      ],
      CLUB,
      MEMBERSHIPS
    )
    const c = contributions[0]!
    expect(c.months_count).toBe(0)
    expect(c.detention_pct).toBe(0)
    expect(c.total_contributed).toBe(0)
    expect(c.penalties).toBe(0)
    expect(c.amount_due).toBe(0)
    expect(c.net_market_value).toBeNull()
  })
})
