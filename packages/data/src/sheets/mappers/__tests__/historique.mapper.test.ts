import { describe, it, expect } from 'vitest'
import { mapHistoriqueRows } from '../historique.mapper'
import type { HistoriqueRowDTO } from '../../../types/sheets'

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

  it('transactionDate invalide → null', () => {
    expect(
      mapHistoriqueRows([makeRow({ transactionDate: 'pasunedate' })], CLUB)[0]!.transaction_date
    ).toBeNull()
  })

  it('transactionDate null → null', () => {
    expect(
      mapHistoriqueRows([makeRow({ transactionDate: null })], CLUB)[0]!.transaction_date
    ).toBeNull()
  })
})
