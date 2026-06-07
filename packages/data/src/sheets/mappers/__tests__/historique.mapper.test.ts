import { describe, it, expect } from 'vitest'
import { mapHistoriqueRows } from '../historique.mapper.ts'
import type { HistoriqueRowDTO } from '../../../types/sheets.ts'

const CLUB = '11111111-1111-1111-1111-111111111111'

function makeRow(overrides: Partial<HistoriqueRowDTO> = {}): HistoriqueRowDTO {
  return {
    type: 'Achat',
    symbol: 'NASDAQ:META',
    name: 'Meta Platforms',
    quantity: 10,
    price: 400,
    total: 4000,
    transactionDate: '01/06/2018',
    notes: null,
    ...overrides,
  }
}

describe('mapHistoriqueRows', () => {
  it('mappe les types FR → enum', () => {
    const rows = [
      makeRow({ type: 'Achat' }),
      makeRow({ type: 'Vente' }),
      makeRow({ type: 'Dividende' }),
      makeRow({ type: 'Coupon' }),
    ]
    const res = mapHistoriqueRows(rows, CLUB)
    expect(res.map((r) => r.type)).toEqual(['buy', 'sell', 'dividend', 'coupon'])
  })

  it('type inconnu → "other"', () => {
    expect(mapHistoriqueRows([makeRow({ type: 'Truc' })], CLUB)[0]!.type).toBe('other')
  })

  it('club_id propagé', () => {
    expect(mapHistoriqueRows([makeRow()], CLUB)[0]!.club_id).toBe(CLUB)
  })

  it('transactionDate FR → ISO yyyy-mm-dd', () => {
    expect(mapHistoriqueRows([makeRow()], CLUB)[0]!.transaction_date).toBe('2018-06-01')
  })

  it('date "d/m/yyyy" sans zéro initial (layout réel) → ISO', () => {
    // Formats relevés dans la matrice : "21/9/2018", "9/7/2021".
    expect(
      mapHistoriqueRows([makeRow({ transactionDate: '21/9/2018' })], CLUB)[0]!.transaction_date
    ).toBe('2018-09-21')
    expect(
      mapHistoriqueRows([makeRow({ transactionDate: '9/7/2021' })], CLUB)[0]!.transaction_date
    ).toBe('2021-07-09')
  })

  it('transactionDate invalide → null', () => {
    expect(
      mapHistoriqueRows([makeRow({ transactionDate: 'pasunedate' })], CLUB)[0]!.transaction_date
    ).toBeNull()
  })

  it('ligne sans date (tableau court) → transaction_date null (quarantaine douce DB)', () => {
    expect(
      mapHistoriqueRows([makeRow({ transactionDate: null })], CLUB)[0]!.transaction_date
    ).toBeNull()
  })

  it('quantité négative (vente) conservée', () => {
    expect(mapHistoriqueRows([makeRow({ type: 'Vente', quantity: -64 })], CLUB)[0]!.quantity).toBe(
      -64
    )
  })

  it('montants déjà nettoyés par le DTO sont propagés tels quels (signe inclus)', () => {
    // Le parser passe "-€2 153,60" dans toNumOrNull → -2153.6 ; le mapper ne fait que propager.
    const r = mapHistoriqueRows([makeRow({ price: 33.65, total: -2153.6 })], CLUB)[0]!
    expect(r.price).toBe(33.65)
    expect(r.total).toBe(-2153.6)
  })

  it('TYPE insensible à la casse/accents (layout réel "ACHAT"/"VENTE")', () => {
    expect(mapHistoriqueRows([makeRow({ type: 'ACHAT' })], CLUB)[0]!.type).toBe('buy')
    expect(mapHistoriqueRows([makeRow({ type: 'VENTE' })], CLUB)[0]!.type).toBe('sell')
    expect(mapHistoriqueRows([makeRow({ type: 'dividende' })], CLUB)[0]!.type).toBe('dividend')
    expect(mapHistoriqueRows([makeRow({ type: '  Coupon ' })], CLUB)[0]!.type).toBe('coupon')
  })

  it('ne lève jamais sur un DTO aux champs null', () => {
    expect(() =>
      mapHistoriqueRows(
        [
          {
            type: '',
            symbol: null,
            name: null,
            quantity: null,
            price: null,
            total: null,
            transactionDate: null,
            notes: null,
          },
        ],
        CLUB
      )
    ).not.toThrow()
  })
})
