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

  // --- Symboles monétaires / pourcentage (layout réel HISTORIQUE & COTISATIONS) ---
  it('préfixe € : "€185,20" → 185.2', () => expect(toNumOrNull('€185,20')).toBe(185.2))
  it('préfixe € + milliers : "€3 704,00" → 3704', () => expect(toNumOrNull('€3 704,00')).toBe(3704))
  it('négatif avec préfixe €  : "-€2 153,60" → -2153.6 (vente)', () =>
    expect(toNumOrNull('-€2 153,60')).toBe(-2153.6))
  it('petit montant préfixé € : "€0,62" → 0.62', () => expect(toNumOrNull('€0,62')).toBe(0.62))
  it('suffixe € : "28 000,00€" → 28000', () => expect(toNumOrNull('28 000,00€')).toBe(28000))
  it('suffixe € (autre) : "68 153,14€" → 68153.14', () =>
    expect(toNumOrNull('68 153,14€')).toBe(68153.14))
  it('pourcentage : "8,99%" → 8.99', () => expect(toNumOrNull('8,99%')).toBe(8.99))
  it('quantité négative simple : "-64" → -64', () => expect(toNumOrNull('-64')).toBe(-64))
  it('décimale sans entier : ",02" → 0.02', () => expect(toNumOrNull(',02')).toBe(0.02))

  // --- Robustesse : cellules sales NE LÈVENT JAMAIS, retombent sur null ---
  it('"#ERROR!" → null (jamais de throw)', () => {
    expect(() => toNumOrNull('#ERROR!')).not.toThrow()
    expect(toNumOrNull('#ERROR!')).toBeNull()
  })
  it('texte inattendu → null', () => expect(toNumOrNull('Situation régulière')).toBeNull())
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
