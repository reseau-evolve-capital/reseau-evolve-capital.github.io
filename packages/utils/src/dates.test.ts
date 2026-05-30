import { describe, it, expect } from 'vitest'
import { parseFrDate, parseFrMonth } from './dates'

describe('parseFrDate', () => {
  it('parse dd/mm/yyyy en Date UTC', () => {
    const d = parseFrDate('01/06/2018')!
    expect(d.getUTCFullYear()).toBe(2018)
    expect(d.getUTCMonth()).toBe(5)
    expect(d.getUTCDate()).toBe(1)
  })
  it('accepte le séparateur - et les espaces', () => {
    expect(parseFrDate(' 15-03-2019 ')!.getUTCMonth()).toBe(2)
  })
  it('retourne null sur vide/null/invalide', () => {
    expect(parseFrDate('')).toBeNull()
    expect(parseFrDate(null)).toBeNull()
    expect(parseFrDate('pas une date')).toBeNull()
    expect(parseFrDate('32/13/2020')).toBeNull()
  })
  it('retourne null pour undefined', () => {
    expect(parseFrDate(undefined)).toBeNull()
  })
  it('29/02/2019 (non-bissextile) retourne null', () => {
    expect(parseFrDate('29/02/2019')).toBeNull()
  })
  it('29/02/2020 (bissextile) est valide', () => {
    expect(parseFrDate('29/02/2020')).not.toBeNull()
  })
})

describe('parseFrMonth', () => {
  it('parse "juin 2018" → { year: 2018, month: 6 }', () => {
    expect(parseFrMonth('juin 2018')).toEqual({ year: 2018, month: 6 })
  })
  it('insensible casse + accents', () => {
    expect(parseFrMonth('Décembre 2020')).toEqual({ year: 2020, month: 12 })
    expect(parseFrMonth('FEVRIER 2021')).toEqual({ year: 2021, month: 2 })
  })
  it('null si mois invalide ou format inconnu', () => {
    expect(parseFrMonth('zorglub 2018')).toBeNull()
    expect(parseFrMonth('')).toBeNull()
    expect(parseFrMonth(null)).toBeNull()
  })
})
