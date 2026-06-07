import { describe, it, expect } from 'vitest'
import {
  normalizeText,
  normalizeCountry,
  isValidCountry,
  parseAmount,
  validateInput,
  buildUpdateArgs,
  brokerRefChanged,
  type ClubSettingsInput,
} from './clubSettings'

const mkInput = (over: Partial<ClubSettingsInput> = {}): ClubSettingsInput => ({
  name: 'Evolve Capital',
  city: 'Paris',
  country: 'FR',
  brokerAccountRef: 'BRK-123',
  annualInvestmentCap: '10000',
  minContribution: '100',
  ...over,
})

describe('normalizeText', () => {
  it('trim et garde une valeur non vide', () => {
    expect(normalizeText('  Paris ')).toBe('Paris')
  })
  it('chaîne vide → null', () => {
    expect(normalizeText('   ')).toBeNull()
  })
})

describe('normalizeCountry', () => {
  it('met en majuscules', () => {
    expect(normalizeCountry('fr')).toBe('FR')
  })
  it('vide → null', () => {
    expect(normalizeCountry('')).toBeNull()
  })
})

describe('isValidCountry', () => {
  it('null est valide (colonne nullable)', () => {
    expect(isValidCountry(null)).toBe(true)
  })
  it('2 lettres valides', () => {
    expect(isValidCountry('BE')).toBe(true)
  })
  it('refuse 3 lettres', () => {
    expect(isValidCountry('FRA')).toBe(false)
  })
  it('refuse les chiffres', () => {
    expect(isValidCountry('F1')).toBe(false)
  })
})

describe('parseAmount', () => {
  it('vide → null', () => {
    expect(parseAmount('  ')).toBeNull()
  })
  it('entier simple', () => {
    expect(parseAmount('10000')).toBe(10000)
  })
  it('décimale FR (virgule)', () => {
    expect(parseAmount('1234,56')).toBe(1234.56)
  })
  it('séparateurs de milliers FR + NBSP', () => {
    expect(parseAmount('1 234,56')).toBe(1234.56)
  })
  it('symbole euro toléré', () => {
    expect(parseAmount('5000 €')).toBe(5000)
  })
  it('texte invalide → NaN', () => {
    expect(Number.isNaN(parseAmount('abc') as number)).toBe(true)
  })
})

describe('validateInput', () => {
  it('entrée valide → aucune erreur', () => {
    expect(validateInput(mkInput())).toEqual([])
  })
  it('nom vide → name_required', () => {
    expect(validateInput(mkInput({ name: '  ' }))).toContain('name_required')
  })
  it('pays 3 lettres → country_invalid', () => {
    expect(validateInput(mkInput({ country: 'FRA' }))).toContain('country_invalid')
  })
  it('pays vide est accepté (nullable)', () => {
    expect(validateInput(mkInput({ country: '' }))).toEqual([])
  })
  it('plafond négatif → cap_invalid', () => {
    expect(validateInput(mkInput({ annualInvestmentCap: '-5' }))).toContain('cap_invalid')
  })
  it('plafond non numérique → cap_invalid', () => {
    expect(validateInput(mkInput({ annualInvestmentCap: 'abc' }))).toContain('cap_invalid')
  })
  it('plafond vide est accepté (nullable)', () => {
    expect(validateInput(mkInput({ annualInvestmentCap: '' }))).toEqual([])
  })
  it('cotisation minimale vide → min_contribution_invalid (requise)', () => {
    expect(validateInput(mkInput({ minContribution: '' }))).toContain('min_contribution_invalid')
  })
  it('cotisation minimale négative → min_contribution_invalid', () => {
    expect(validateInput(mkInput({ minContribution: '-1' }))).toContain('min_contribution_invalid')
  })
  it('cotisation minimale valide → aucune erreur', () => {
    expect(validateInput(mkInput({ minContribution: '150' }))).toEqual([])
  })
})

describe('buildUpdateArgs', () => {
  it('mappe et normalise tous les champs', () => {
    expect(buildUpdateArgs('club-1', mkInput())).toEqual({
      p_club_id: 'club-1',
      p_name: 'Evolve Capital',
      p_city: 'Paris',
      p_country: 'FR',
      p_broker_account_ref: 'BRK-123',
      p_annual_investment_cap: 10000,
      p_min_contribution: 100,
    })
  })
  it('champs vides → null (city, broker, cap)', () => {
    const args = buildUpdateArgs(
      'club-1',
      mkInput({ city: '', brokerAccountRef: '', annualInvestmentCap: '' })
    )
    expect(args.p_city).toBeNull()
    expect(args.p_broker_account_ref).toBeNull()
    expect(args.p_annual_investment_cap).toBeNull()
  })
  it('pays passé en majuscules', () => {
    expect(buildUpdateArgs('club-1', mkInput({ country: 'be' })).p_country).toBe('BE')
  })
})

describe('brokerRefChanged', () => {
  it('détecte un changement', () => {
    expect(brokerRefChanged('OLD', 'NEW')).toBe(true)
  })
  it('null actuel vers vide saisi = pas de changement', () => {
    expect(brokerRefChanged(null, '  ')).toBe(false)
  })
  it('valeur identique = pas de changement', () => {
    expect(brokerRefChanged('BRK-1', 'BRK-1')).toBe(false)
  })
})
