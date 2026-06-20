import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  currencySymbol,
  formatEUR,
  formatPct,
  formatDate,
  formatDateLong,
  formatMonth,
} from './format.ts'

describe('formatCurrency', () => {
  it('EUR : formate un montant décimal', () => {
    const result = formatCurrency(65574.87, 'EUR')
    expect(result).toContain('65')
    expect(result).toContain('574')
    expect(result).toContain('87')
    expect(result).toContain('€')
  })
  it('EUR : formate zéro', () => {
    expect(formatCurrency(0, 'EUR')).toContain('0')
  })
  it('XOF : formate un montant en Franc CFA', () => {
    const result = formatCurrency(150000, 'XOF')
    expect(result).toContain('150')
    expect(result).toMatch(/CFA|FCFA|XOF/i)
  })
  it('USD : formate un montant en dollar', () => {
    const result = formatCurrency(1234.56, 'USD')
    expect(result).toContain('1')
    expect(result).toContain('234')
    // Le symbole $ ou le code USD doit apparaître selon la locale
    expect(result.length).toBeGreaterThan(4)
  })
  it('CHF : formate un montant en franc suisse', () => {
    const result = formatCurrency(9999.99, 'CHF')
    expect(result).toContain('9')
    expect(result).toMatch(/CHF|Fr\.|Fr\s/i)
  })
  it('retourne — pour null', () => {
    expect(formatCurrency(null, 'EUR')).toBe('—')
  })
  it('retourne — pour undefined', () => {
    expect(formatCurrency(undefined, 'EUR')).toBe('—')
  })
  it('retourne — pour NaN', () => {
    expect(formatCurrency(NaN, 'EUR')).toBe('—')
  })
  it('retourne — pour Infinity', () => {
    expect(formatCurrency(Infinity, 'EUR')).toBe('—')
  })
  it('devise invalide : ne crash pas, affiche le nombre + code', () => {
    const result = formatCurrency(1000, 'ZZZ')
    expect(result).toContain('1')
    expect(result).toContain('ZZZ')
  })
  it('locale en-US : symbole USD en préfixe', () => {
    const result = formatCurrency(1234.5, 'USD', 'en-US')
    expect(result).toMatch(/^\$/)
  })
})

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
  it('retourne — pour null (rétro-compatibilité signature élargie)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(formatEUR(null as any)).toBe('—')
  })
  it('est identique à formatCurrency(value, EUR)', () => {
    expect(formatEUR(1234.56)).toBe(formatCurrency(1234.56, 'EUR'))
    expect(formatEUR(0)).toBe(formatCurrency(0, 'EUR'))
    expect(formatEUR(NaN)).toBe(formatCurrency(NaN, 'EUR'))
  })
})

describe('currencySymbol', () => {
  it('EUR → €', () => {
    expect(currencySymbol('EUR')).toBe('€')
  })
  it('USD → $ (fr-FR)', () => {
    // En fr-FR Intl peut rendre "$US" ou "$" selon l'environnement ; doit contenir '$'
    expect(currencySymbol('USD')).toContain('$')
  })
  it('USD → $ (en-US)', () => {
    expect(currencySymbol('USD', 'en-US')).toBe('$')
  })
  it('XOF → symbole CFA (fr-FR)', () => {
    const sym = currencySymbol('XOF')
    // Intl peut rendre "FCFA", "F CFA", "CFA" selon la plateforme
    expect(sym).toMatch(/CFA|FCFA|XOF/i)
  })
  it('CHF → symbole CHF', () => {
    const sym = currencySymbol('CHF')
    expect(sym).toMatch(/CHF|Fr\.?/i)
  })
  it('devise inconnue : retourne le code tel quel', () => {
    expect(currencySymbol('ZZZ')).toBe('ZZZ')
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
