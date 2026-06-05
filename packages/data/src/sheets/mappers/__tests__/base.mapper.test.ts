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
  it('email présent → email_is_placeholder = false', () => {
    expect(mapBaseRowToMember(row, CLUB).user.email_is_placeholder).toBe(false)
  })
  it('email présent → sheetEmailEmpty = false (la feuille fournit un email)', () => {
    expect(mapBaseRowToMember(row, CLUB).sheetEmailEmpty).toBe(false)
  })
  it('email VIDE → sheetEmailEmpty = true (signal pour resolveBaseEmail)', () => {
    expect(mapBaseRowToMember({ ...row, email: '   ' }, CLUB).sheetEmailEmpty).toBe(true)
  })
  it('email malformé (non vide) → conservé tel quel, PAS de placeholder', () => {
    // Principe "aucune perte" : on garde l'info brute (trim+lowercase), flag false.
    // Il ne recevra de toute façon pas de magic link (hors allowlist).
    const { user } = mapBaseRowToMember({ ...row, email: ' PasUnEmail ' }, CLUB)
    expect(user.email).toBe('pasunemail')
    expect(user.email_is_placeholder).toBe(false)
  })
  it('email VIDE → placeholder déterministe + email_is_placeholder = true', () => {
    const { user } = mapBaseRowToMember({ ...row, fullName: 'OURO SAMA Jalil', email: '' }, CLUB)
    expect(user.email).toBe(`sans-email.ouro-sama-jalil@${CLUB}.local`)
    expect(user.email_is_placeholder).toBe(true)
  })
  it('email VIDE (espaces seuls) → placeholder', () => {
    const { user } = mapBaseRowToMember({ ...row, fullName: 'ROSSI Greg', email: '   ' }, CLUB)
    expect(user.email).toBe(`sans-email.rossi-greg@${CLUB}.local`)
    expect(user.email_is_placeholder).toBe(true)
  })
  it('placeholder IDEMPOTENT (même nom+club → même email à chaque sync)', () => {
    const a = mapBaseRowToMember({ ...row, fullName: 'NGORAN Stéphane', email: '' }, CLUB)
    const b = mapBaseRowToMember({ ...row, fullName: 'NGORAN Stéphane', email: '' }, CLUB)
    expect(a.user.email).toBe(b.user.email)
    expect(a.user.email).toBe(`sans-email.ngoran-stephane@${CLUB}.local`)
  })
  it('placeholder distinct par membre (pas de collision onConflict email)', () => {
    const j = mapBaseRowToMember({ ...row, fullName: 'OURO SAMA Jalil', email: '' }, CLUB)
    const d = mapBaseRowToMember({ ...row, fullName: 'TCHOUTA David', email: '' }, CLUB)
    expect(j.user.email).not.toBe(d.user.email)
  })
  it('email VIDE + fullName vide → placeholder "anonyme" (jamais de crash)', () => {
    const { user } = mapBaseRowToMember({ ...row, fullName: '   ', email: '' }, CLUB)
    expect(user.email).toBe(`sans-email.anonyme@${CLUB}.local`)
    expect(user.email_is_placeholder).toBe(true)
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
