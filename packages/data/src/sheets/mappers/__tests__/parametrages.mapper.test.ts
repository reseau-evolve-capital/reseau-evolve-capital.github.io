import { describe, it, expect } from 'vitest'
import {
  mapParametragesToClub,
  mapParametragesToOfficers,
  stripEmptyClubMeta,
} from '../parametrages.mapper.ts'

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

describe('stripEmptyClubMeta (anti-écrasement ville/pays au sync)', () => {
  it("retire city/country quand null → l'UPDATE ne les touche pas (valeur en base préservée)", () => {
    const out = stripEmptyClubMeta({ name: 'Club', city: null, country: null })
    expect('city' in out).toBe(false)
    expect('country' in out).toBe(false)
    expect(out.name).toBe('Club')
  })

  it('retire city/country quand chaîne vide ou espaces', () => {
    const out = stripEmptyClubMeta({ city: '', country: '   ' })
    expect('city' in out).toBe(false)
    expect('country' in out).toBe(false)
  })

  it('PRÉSERVE city/country quand renseignées (la feuille fait alors autorité)', () => {
    const out = stripEmptyClubMeta({ city: 'Cotonou', country: 'BJ' })
    expect(out.city).toBe('Cotonou')
    expect(out.country).toBe('BJ')
  })

  it("ne mute pas l'objet source", () => {
    const src = { city: null as string | null, country: 'FR' }
    stripEmptyClubMeta(src)
    expect(src.city).toBeNull()
    expect(src.country).toBe('FR')
  })
})

describe('mapParametragesToOfficers', () => {
  it('extrait les noms BRUTS du président et du trésorier', () => {
    const officers = mapParametragesToOfficers([
      {
        clubName: 'Evolve Capital',
        minContribution: 100,
        presidentName: 'AGBEHONOU Edem',
        treasurerName: 'HOUESSOU Valentino',
      },
    ])
    // Noms renvoyés tels quels (la normalisation pour matching vit ailleurs).
    expect(officers.presidentName).toBe('AGBEHONOU Edem')
    expect(officers.treasurerName).toBe('HOUESSOU Valentino')
  })

  it('trim les noms et mappe la chaîne vide → null', () => {
    const officers = mapParametragesToOfficers([
      {
        clubName: 'Club',
        minContribution: 0,
        presidentName: '  AGBEHONOU Edem  ',
        treasurerName: '   ',
      },
    ])
    expect(officers.presidentName).toBe('AGBEHONOU Edem')
    expect(officers.treasurerName).toBeNull()
  })

  it('dirigeants absents → null (pas de crash)', () => {
    const officers = mapParametragesToOfficers([{ clubName: 'Club', minContribution: 0 }])
    expect(officers.presidentName).toBeNull()
    expect(officers.treasurerName).toBeNull()
  })

  it('feuille vide → dirigeants null (pas d exception)', () => {
    const officers = mapParametragesToOfficers([])
    expect(officers.presidentName).toBeNull()
    expect(officers.treasurerName).toBeNull()
  })
})
