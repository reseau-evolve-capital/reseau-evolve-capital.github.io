import { describe, it, expect } from 'vitest'
import { mapParametragesToClub } from '../parametrages.mapper'

describe('mapParametragesToClub', () => {
  it('génère slug + settings.penalty_rate', () => {
    const club = mapParametragesToClub(
      [
        {
          clubName: 'Evolve Club Paris',
          minContribution: 100,
          penaltyRate: 0.05,
          city: 'Paris',
          country: 'FR',
        },
      ],
      'sheet-123'
    )
    expect(club.slug).toBe('evolve-club-paris')
    expect(club.sheet_id).toBe('sheet-123')
    expect(club.min_contribution).toBe(100)
    expect(club.settings?.penalty_rate).toBe(0.05)
  })
  it('slug sans accents', () => {
    const club = mapParametragesToClub([{ clubName: 'Club Évolvé', minContribution: 50 }], 's')
    expect(club.slug).toBe('club-evolve')
  })
  it('throw si aucune ligne', () => {
    expect(() => mapParametragesToClub([], 's')).toThrow(/PARAMETRAGES/)
  })

  it('capte broker_account_ref (string TEXT brute) et annual_investment_cap (NUMERIC)', () => {
    const club = mapParametragesToClub(
      [
        {
          clubName: 'Evolve Club Paris',
          minContribution: 100,
          brokerAccountRef: '85537808',
          annualInvestmentCap: 5500,
          brokerName: 'BOURSE DIRECT',
        },
      ],
      'sheet-1'
    )
    // broker_account_ref reste une string TEXT (zéros non significatifs, pas un nombre).
    expect(club.broker_account_ref).toBe('85537808')
    // annual_investment_cap est numérique.
    expect(club.annual_investment_cap).toBe(5500)
    // Le nom du courtier n'a pas de colonne dédiée : il atterrit dans settings.
    expect(club.settings?.broker_name).toBe('BOURSE DIRECT')
  })

  it('broker/annual/broker_name absents → null / undefined (pas de crash)', () => {
    const club = mapParametragesToClub(
      [{ clubName: 'Club Sans Courtier', minContribution: 0 }],
      's'
    )
    expect(club.broker_account_ref).toBeNull()
    expect(club.annual_investment_cap).toBeNull()
    expect(club.settings?.broker_name).toBeNull()
  })

  it('country null reste null (colonne devenue nullable, migration 024)', () => {
    const club = mapParametragesToClub([{ clubName: 'Club', minContribution: 0 }], 's')
    expect(club.country).toBeNull()
  })
})
