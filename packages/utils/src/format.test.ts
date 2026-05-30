import { describe, it, expect } from 'vitest'
import { formatEUR, formatPct, formatDate, formatMonth } from './format'

describe('formatEUR', () => {
  it('formate un montant décimal', () => {
    const result = formatEUR(65574.87)
    expect(result).toContain('65')
    expect(result).toContain('574')
    expect(result).toContain('87')
    expect(result).toContain('€')
  })
  it('formate zéro', () => {
    expect(formatEUR(0)).toContain('0')
  })
  it('retourne — pour NaN', () => {
    expect(formatEUR(NaN)).toBe('—')
  })
  it('retourne — pour Infinity', () => {
    expect(formatEUR(Infinity)).toBe('—')
  })
  it('retourne — pour -Infinity', () => {
    expect(formatEUR(-Infinity)).toBe('—')
  })
})

describe('formatPct', () => {
  it('formate un pourcentage positif', () => {
    const result = formatPct(0.0123)
    expect(result).toContain('1')
    expect(result).toContain('23')
    expect(result).toContain('%')
  })
  it('retourne — pour NaN', () => {
    expect(formatPct(NaN)).toBe('—')
  })
  it('sans signe si showSign=false', () => {
    const result = formatPct(0.05, { showSign: false })
    expect(result).not.toContain('+')
  })
})

describe('formatDate', () => {
  it('formate une date', () => {
    const result = formatDate(new Date('2026-05-03T12:00:00'))
    expect(result).toContain('05')
    expect(result).toContain('2026')
  })
  it('retourne — pour une date invalide', () => {
    expect(formatDate('not-a-date')).toBe('—')
  })
})

describe('formatMonth', () => {
  it('formate mois + année', () => {
    const result = formatMonth(new Date('2026-05-01T12:00:00'))
    expect(result).toContain('2026')
  })
})
