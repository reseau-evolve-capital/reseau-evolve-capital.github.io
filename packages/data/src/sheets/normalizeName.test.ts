import { describe, it, expect } from 'vitest'
import { normalizeName } from './normalizeName.ts'

describe('normalizeName', () => {
  it('met en minuscule, retire les accents et trim', () => {
    expect(normalizeName('HOUESSOU Valentino')).toBe('houessou valentino')
    expect(normalizeName('  Houéssou Valentino  ')).toBe('houessou valentino')
  })

  it('rapproche deux variantes accents/casse du même nom', () => {
    expect(normalizeName('AGBEHONOU Édem')).toBe(normalizeName('agbehonou edem'))
    expect(normalizeName('é/è/ê absorbés')).toBe('e/e/e absorbes')
  })

  it('compacte les espaces internes multiples', () => {
    expect(normalizeName('HOUESSOU    Valentino')).toBe('houessou valentino')
    expect(normalizeName('A\tB\nC')).toBe('a b c')
  })

  it('entrée vide / nullish → ""', () => {
    expect(normalizeName('')).toBe('')
    expect(normalizeName('   ')).toBe('')
    expect(normalizeName(null)).toBe('')
    expect(normalizeName(undefined)).toBe('')
  })

  it('idempotent (normalizeName(normalizeName(x)) === normalizeName(x))', () => {
    const x = '  AGBEHONOU   Édem '
    expect(normalizeName(normalizeName(x))).toBe(normalizeName(x))
  })

  it('déterministe (2 appels = même sortie)', () => {
    expect(normalizeName('HOUNSONLON Radi')).toBe(normalizeName('HOUNSONLON Radi'))
  })
})
