import { describe, it, expect } from 'vitest'
import { parseFrDate, parseFrMonth, parseReportingDate, formatRelativeTime } from './dates.ts'

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

describe('parseReportingDate', () => {
  it('parse "dimanche, 03/05/2026" en Date UTC à minuit', () => {
    const d = parseReportingDate('dimanche, 03/05/2026')!
    expect(d.getUTCFullYear()).toBe(2026)
    expect(d.getUTCMonth()).toBe(4)
    expect(d.getUTCDate()).toBe(3)
    expect(d.getUTCHours()).toBe(0)
  })
  it('parse une date nue "03/05/2026" (sans jour de semaine)', () => {
    const d = parseReportingDate('03/05/2026')!
    expect(d.getUTCFullYear()).toBe(2026)
    expect(d.getUTCMonth()).toBe(4)
    expect(d.getUTCDate()).toBe(3)
  })
  it('tolère l\'absence d\'espace après la virgule et la casse ("Mercredi,01/01/2020")', () => {
    const d = parseReportingDate('Mercredi,01/01/2020')!
    expect(d.getUTCFullYear()).toBe(2020)
    expect(d.getUTCMonth()).toBe(0)
    expect(d.getUTCDate()).toBe(1)
  })
  it('accepte jour/mois à 1 chiffre ("lundi, 1/6/2018")', () => {
    const d = parseReportingDate('lundi, 1/6/2018')!
    expect(d.getUTCFullYear()).toBe(2018)
    expect(d.getUTCMonth()).toBe(5)
    expect(d.getUTCDate()).toBe(1)
  })
  it('tolère les espaces parasites ("  samedi , 25/12/2021  ")', () => {
    const d = parseReportingDate('  samedi , 25/12/2021  ')!
    expect(d.getUTCFullYear()).toBe(2021)
    expect(d.getUTCMonth()).toBe(11)
    expect(d.getUTCDate()).toBe(25)
  })
  it('retourne null sur date impossible ("dimanche, 32/13/2026")', () => {
    expect(parseReportingDate('dimanche, 32/13/2026')).toBeNull()
  })
  it('retourne null sur vide/null/undefined', () => {
    expect(parseReportingDate('')).toBeNull()
    expect(parseReportingDate(null)).toBeNull()
    expect(parseReportingDate(undefined)).toBeNull()
  })
  it('retourne null sur une chaîne sans date', () => {
    expect(parseReportingDate('pas une date')).toBeNull()
  })
  it('29/02/2023 (non-bissextile) retourne null — cohérence parseFrDate', () => {
    expect(parseReportingDate('29/02/2023')).toBeNull()
  })
})

describe('formatRelativeTime', () => {
  const now = new Date('2026-05-31T12:00:00Z')
  it('moins d\'une minute → "à l\'instant"', () => {
    expect(formatRelativeTime(new Date('2026-05-31T11:59:30Z'), now)).toBe("à l'instant")
  })
  it('minutes → "il y a 14 min"', () => {
    expect(formatRelativeTime(new Date('2026-05-31T11:46:00Z'), now)).toBe('il y a 14 min')
  })
  it('heures → "il y a 2 h"', () => {
    expect(formatRelativeTime(new Date('2026-05-31T10:00:00Z'), now)).toBe('il y a 2 h')
  })
  it('jours → "il y a 3 j"', () => {
    expect(formatRelativeTime(new Date('2026-05-28T12:00:00Z'), now)).toBe('il y a 3 j')
  })
  it('entrée invalide → "—"', () => {
    expect(formatRelativeTime('pas une date', now)).toBe('—')
  })
  it('locale en → format abrégé anglais', () => {
    expect(formatRelativeTime(new Date('2026-05-31T11:59:30Z'), now, 'en-US')).toBe('just now')
    expect(formatRelativeTime(new Date('2026-05-31T11:46:00Z'), now, 'en-US')).toBe('14 min ago')
    expect(formatRelativeTime(new Date('2026-05-31T10:00:00Z'), now, 'en-US')).toBe('2 h ago')
    expect(formatRelativeTime(new Date('2026-05-28T12:00:00Z'), now, 'en-US')).toBe('3 d ago')
  })
})
