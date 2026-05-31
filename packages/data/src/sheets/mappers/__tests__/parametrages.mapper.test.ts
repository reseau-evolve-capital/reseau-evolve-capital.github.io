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
})
