import { describe, it, expect } from 'vitest'
import { toNum, toNumOrNull, toInt } from './numeric'

describe('toNumOrNull (nettoyage FR)', () => {
  it('"1 234,56" (NBSP U+00A0) → 1234.56', () => {
    expect(toNumOrNull('1 234,56')).toBe(1234.56)
  })
  it('"1 234,56" (narrow-NBSP U+202F) → 1234.56', () => {
    expect(toNumOrNull('1 234,56')).toBe(1234.56)
  })
  it('"1.234,56" (point milliers + virgule décimale FR) → 1234.56', () => {
    expect(toNumOrNull('1.234,56')).toBe(1234.56)
  })
  it('"19,90" → 19.9', () => expect(toNumOrNull('19,90')).toBe(19.9))
  it('vide / NaN → null', () => {
    expect(toNumOrNull('')).toBeNull()
    expect(toNumOrNull('--')).toBeNull()
    expect(toNumOrNull(null)).toBeNull()
  })
})
describe('toNum', () => {
  it('fallback 0 si invalide', () => expect(toNum('--')).toBe(0))
})
describe('toInt', () => {
  it('"24" → 24, "" → 0', () => {
    expect(toInt('24')).toBe(24)
    expect(toInt('')).toBe(0)
  })
})
