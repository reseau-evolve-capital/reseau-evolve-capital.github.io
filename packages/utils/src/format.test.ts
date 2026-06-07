import { describe, it, expect } from 'vitest'
import { formatEUR, formatPct, formatDate, formatDateLong, formatMonth } from './format.ts'

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

describe('locale-aware (I18N-001) — FR par défaut, EN sur demande', () => {
  it('formatEUR : FR par défaut (€ en suffixe) vs en-US (€ en préfixe)', () => {
    expect(formatEUR(1234.5)).toMatch(/€$/) // "1 234,50 €"
    const en = formatEUR(1234.5, 'en-US')
    expect(en).toMatch(/^€/) // "€1,234.50"
    expect(en).toContain('1,234.50')
  })
  it('formatPct : séparateur décimal localisé', () => {
    expect(formatPct(0.0123)).toContain(',') // "+1,23 %"
    expect(formatPct(0.0123, { locale: 'en-US' })).toContain('.') // "+1.23%"
  })
  it('formatDateLong : jour de semaine localisé', () => {
    const d = new Date('2026-04-24T12:00:00')
    expect(formatDateLong(d)).toContain('avril')
    expect(formatDateLong(d, 'en-US')).toContain('April')
  })
})
