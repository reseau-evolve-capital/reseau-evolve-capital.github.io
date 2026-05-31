import { describe, it, expect } from 'vitest'
import { mapBaseRowToMember } from '../base.mapper'
import type { BaseRowDTO } from '../../../types/sheets'

const CLUB = '11111111-1111-1111-1111-111111111111'
const row: BaseRowDTO = {
  fullName: 'AFOUDAH Ruben',
  email: 'Ruben@Example.com ',
  joinedAt: '01/06/2018',
  leftAt: null,
  status: 'Membre actif',
  phone: '0600000000',
  address: 'Paris',
}

describe('mapBaseRowToMember', () => {
  it('décompose fullName: lastname=AFOUDAH, firstname=Ruben', () => {
    const { user } = mapBaseRowToMember(row, CLUB)
    expect(user.lastname).toBe('AFOUDAH')
    expect(user.firstname).toBe('Ruben')
    expect(user.full_name).toBe('AFOUDAH Ruben')
  })
  it('normalise email (lowercase + trim)', () => {
    expect(mapBaseRowToMember(row, CLUB).user.email).toBe('ruben@example.com')
  })
  it('joined_at = date ISO yyyy-mm-dd', () => {
    expect(mapBaseRowToMember(row, CLUB).membership.joined_at).toBe('2018-06-01')
  })
  it('statut "Membre actif" → active', () => {
    expect(mapBaseRowToMember(row, CLUB).membership.status).toBe('active')
  })
  it('statut "Membre sorti" → left + leave_at', () => {
    const { membership } = mapBaseRowToMember(
      { ...row, status: 'Membre sorti', leftAt: '30/11/2023' },
      CLUB
    )
    expect(membership.status).toBe('left')
    expect(membership.leave_at).toBe('2023-11-30')
  })
  it('email invalide → throw', () => {
    expect(() => mapBaseRowToMember({ ...row, email: 'pasunemail' }, CLUB)).toThrow(/email/i)
  })
  it('statut inconnu → throw', () => {
    expect(() => mapBaseRowToMember({ ...row, status: 'En cours' }, CLUB)).toThrow(
      /statut inconnu/i
    )
  })
  it('nom mononyme: lastname rempli, firstname vide', () => {
    const { user } = mapBaseRowToMember({ ...row, fullName: 'DIALLO' }, CLUB)
    expect(user.lastname).toBe('DIALLO')
    expect(user.firstname).toBe('')
  })
  it('prénom composé: firstname = reste joint', () => {
    const { user } = mapBaseRowToMember({ ...row, fullName: 'DIALLO Mamadou Abdoulaye' }, CLUB)
    expect(user.lastname).toBe('DIALLO')
    expect(user.firstname).toBe('Mamadou Abdoulaye')
  })
  it('phone/address absents → null', () => {
    const { user } = mapBaseRowToMember(
      {
        fullName: 'X Y',
        email: 'x@y.io',
        joinedAt: '01/01/2020',
        leftAt: null,
        status: 'Membre actif',
      },
      CLUB
    )
    expect(user.phone).toBeNull()
    expect(user.address).toBeNull()
  })
  it('idempotent (2 appels = même résultat)', () => {
    expect(mapBaseRowToMember(row, CLUB)).toEqual(mapBaseRowToMember(row, CLUB))
  })
})
