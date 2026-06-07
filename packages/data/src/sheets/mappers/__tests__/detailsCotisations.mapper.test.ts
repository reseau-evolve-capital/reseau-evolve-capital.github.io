import { describe, it, expect } from 'vitest'
import { mapDetailsCotisationsRows } from '../detailsCotisations.mapper.ts'
import type { MembershipLookup } from '../../../types/sheets.ts'

const CLUB = '11111111-1111-1111-1111-111111111111'
const MEMBERSHIPS: MembershipLookup[] = [{ id: 'm-1', user_id: 'u-1', full_name: 'AFOUDAH Ruben' }]
const NOW = new Date(Date.UTC(2026, 0, 1)) // 1er janvier 2026

const HEADERS = ['Periode', '100', 'AFOUDAH Ruben', 'UNKNOWN Person']

describe('mapDetailsCotisationsRows', () => {
  it('parse période "juin 2018" → year 2018, month 6', () => {
    const rows = [HEADERS, ['juin 2018', '100', '100', '']]
    const { months } = mapDetailsCotisationsRows(rows, CLUB, MEMBERSHIPS, NOW)
    expect(months[0]!.year).toBe(2018)
    expect(months[0]!.month).toBe(6)
  })

  it('montant > 0 → status "paid"', () => {
    const rows = [HEADERS, ['juin 2018', '100', '100', '']]
    const { months } = mapDetailsCotisationsRows(rows, CLUB, MEMBERSHIPS, NOW)
    const afoudah = months.find((m) => m.membership_id === 'm-1')!
    expect(afoudah.amount).toBe(100)
    expect(afoudah.status).toBe('paid')
  })

  it('en-tête non résolu → unmatched', () => {
    const rows = [HEADERS, ['juin 2018', '100', '100', '']]
    const { unmatched } = mapDetailsCotisationsRows(rows, CLUB, MEMBERSHIPS, NOW)
    expect(unmatched).toContain('UNKNOWN Person')
  })

  it('période future + montant vide → status "due"', () => {
    const rows = [HEADERS, ['juin 2030', '100', '', '']]
    const { months } = mapDetailsCotisationsRows(rows, CLUB, MEMBERSHIPS, NOW)
    const afoudah = months.find((m) => m.membership_id === 'm-1')!
    expect(afoudah.status).toBe('due')
  })

  it('période passée + montant vide → status "late"', () => {
    const rows = [HEADERS, ['juin 2018', '100', '', '']]
    const { months } = mapDetailsCotisationsRows(rows, CLUB, MEMBERSHIPS, NOW)
    const afoudah = months.find((m) => m.membership_id === 'm-1')!
    expect(afoudah.status).toBe('late')
    expect(afoudah.amount).toBe(0)
  })

  it('mois courant ("janvier 2026") + montant vide → status "due" (pas late)', () => {
    const rows = [HEADERS, ['janvier 2026', '100', '', '']]
    const { months } = mapDetailsCotisationsRows(rows, CLUB, MEMBERSHIPS, NOW)
    const afoudah = months.find((m) => m.membership_id === 'm-1')!
    expect(afoudah.status).toBe('due')
  })

  it('mois strictement passé ("décembre 2025") + montant vide → status "late"', () => {
    const rows = [HEADERS, ['décembre 2025', '100', '', '']]
    const { months } = mapDetailsCotisationsRows(rows, CLUB, MEMBERSHIPS, NOW)
    const afoudah = months.find((m) => m.membership_id === 'm-1')!
    expect(afoudah.status).toBe('late')
  })

  it('mois futur ("juin 2030") + montant vide → status "due"', () => {
    const rows = [HEADERS, ['juin 2030', '100', '', '']]
    const { months } = mapDetailsCotisationsRows(rows, CLUB, MEMBERSHIPS, NOW)
    const afoudah = months.find((m) => m.membership_id === 'm-1')!
    expect(afoudah.status).toBe('due')
  })

  it('2 membres sur une période, issues mixtes (payé > 0 vs vide) → 2 months, statuts corrects', () => {
    const members: MembershipLookup[] = [
      { id: 'm-1', user_id: 'u-1', full_name: 'AFOUDAH Ruben' },
      { id: 'm-2', user_id: 'u-2', full_name: 'DIALLO Mamadou' },
    ]
    const headers = ['Periode', '100', 'AFOUDAH Ruben', 'DIALLO Mamadou']
    // période strictement passée : montant vide → late
    const rows = [headers, ['décembre 2025', '100', '150', '']]
    const { months } = mapDetailsCotisationsRows(rows, CLUB, members, NOW)
    expect(months).toHaveLength(2)
    const ruben = months.find((m) => m.membership_id === 'm-1')!
    const mamadou = months.find((m) => m.membership_id === 'm-2')!
    expect(ruben.amount).toBe(150)
    expect(ruben.status).toBe('paid')
    expect(mamadou.amount).toBe(0)
    expect(mamadou.status).toBe('late')
  })

  it('colonne "100" ignorée (ne produit jamais de month)', () => {
    const rows = [HEADERS, ['juin 2018', '100', '100', '']]
    const { months } = mapDetailsCotisationsRows(rows, CLUB, MEMBERSHIPS, NOW)
    // un seul membre résolu (AFOUDAH) → un seul month
    expect(months).toHaveLength(1)
    expect(months[0]!.membership_id).toBe('m-1')
  })

  it('période invalide → ligne ignorée', () => {
    const rows = [HEADERS, ['pas une periode', '100', '100', '']]
    const { months } = mapDetailsCotisationsRows(rows, CLUB, MEMBERSHIPS, NOW)
    expect(months).toHaveLength(0)
  })

  it('feuille vide (pas d en-têtes) → résultat vide', () => {
    const { months, unmatched } = mapDetailsCotisationsRows([], CLUB, MEMBERSHIPS, NOW)
    expect(months).toHaveLength(0)
    expect(unmatched).toHaveLength(0)
  })

  it('matching strict insensible à la casse sur les en-têtes', () => {
    const headers = ['Periode', '100', 'afoudah ruben']
    const rows = [headers, ['juin 2018', '100', '50']]
    const { months, unmatched } = mapDetailsCotisationsRows(rows, CLUB, MEMBERSHIPS, NOW)
    expect(months).toHaveLength(1)
    expect(months[0]!.membership_id).toBe('m-1')
    expect(unmatched).toHaveLength(0)
  })
})
