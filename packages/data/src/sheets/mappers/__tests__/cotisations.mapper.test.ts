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

  it('mappe les statuts FR/EN', () => {
    const cases: Array<[string, string]> = [
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
