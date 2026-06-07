import { describe, it, expect } from 'vitest'
import { resolveBaseEmail, normalizeName } from '../baseEmailResolution.ts'
import type { MembershipLookup, UserUpsert } from '../../../types/sheets.ts'

const CLUB = '11111111-1111-1111-1111-111111111111'

/** Fabrique l'output « user » mappé pour une ligne Base (champs utiles à la résolution). */
function mapped(
  fullName: string,
  email: string,
  emailIsPlaceholder: boolean
): Pick<UserUpsert, 'email' | 'full_name' | 'email_is_placeholder'> {
  return { full_name: fullName, email, email_is_placeholder: emailIsPlaceholder }
}

const placeholder = (slug: string) => `sans-email.${slug}@${CLUB}.local`

describe('normalizeName', () => {
  it('trim + lowercase + stripAccents', () => {
    expect(normalizeName('  NGORAN Stéphane ')).toBe('ngoran stephane')
  })
  it('absorbe la variation accentuée (match accent ≡ sans accent)', () => {
    expect(normalizeName('NGORAN Stéphane')).toBe(normalizeName('ngoran stephane'))
  })
})

describe('resolveBaseEmail', () => {
  it('feuille NON vide → email mappé conservé, flag inchangé (source de vérité)', () => {
    const r = resolveBaseEmail(mapped('AFOUDAH Ruben', 'ruben@example.com', false), false, [])
    expect(r.email).toBe('ruben@example.com')
    expect(r.email_is_placeholder).toBe(false)
    expect(r.warning).toBeNull()
  })

  it('feuille NON vide → on n’écrase JAMAIS, même si un membre existe avec un autre email', () => {
    const existing: MembershipLookup[] = [
      {
        id: 'm-1',
        user_id: 'u-1',
        full_name: 'AFOUDAH Ruben',
        email: 'old@x.io',
        email_is_placeholder: false,
      },
    ]
    const r = resolveBaseEmail(mapped('AFOUDAH Ruben', 'nouveau@x.io', false), false, existing)
    expect(r.email).toBe('nouveau@x.io')
  })

  it('feuille VIDE + membre existant avec VRAI email (saisi admin) → email PRÉSERVÉ', () => {
    // Coeur du fix : l'admin a remplacé le placeholder par un vrai email. Re-sync feuille
    // toujours vide → on réutilise le vrai email (pas le placeholder régénéré) → pas de doublon.
    const existing: MembershipLookup[] = [
      {
        id: 'm-1',
        user_id: 'u-1',
        full_name: 'OURO SAMA Jalil',
        email: 'jalil@gmail.com',
        email_is_placeholder: false,
      },
    ]
    const r = resolveBaseEmail(
      mapped('OURO SAMA Jalil', placeholder('ouro-sama-jalil'), true),
      true,
      existing
    )
    expect(r.email).toBe('jalil@gmail.com')
    expect(r.email_is_placeholder).toBe(false) // inchangé : reste un vrai email
    expect(r.warning).toBeNull()
  })

  it('feuille VIDE + membre existant ENCORE placeholder → placeholder existant réutilisé (idempotent)', () => {
    const existing: MembershipLookup[] = [
      {
        id: 'm-1',
        user_id: 'u-1',
        full_name: 'ROSSI Greg',
        email: placeholder('rossi-greg'),
        email_is_placeholder: true,
      },
    ]
    const r = resolveBaseEmail(
      mapped('ROSSI Greg', placeholder('rossi-greg'), true),
      true,
      existing
    )
    expect(r.email).toBe(placeholder('rossi-greg'))
    expect(r.email_is_placeholder).toBe(true)
    expect(r.warning).toBeNull()
  })

  it('feuille VIDE + match insensible aux accents → email existant préservé', () => {
    const existing: MembershipLookup[] = [
      {
        id: 'm-1',
        user_id: 'u-1',
        full_name: 'NGORAN Stephane',
        email: 'stephane@x.io',
        email_is_placeholder: false,
      },
    ]
    const r = resolveBaseEmail(
      mapped('NGORAN Stéphane', placeholder('ngoran-stephane'), true),
      true,
      existing
    )
    expect(r.email).toBe('stephane@x.io')
  })

  it('feuille VIDE + NOUVEAU membre (aucun match) → placeholder déterministe', () => {
    const r = resolveBaseEmail(
      mapped('TCHOUTA David', placeholder('tchouta-david'), true),
      true,
      []
    )
    expect(r.email).toBe(placeholder('tchouta-david'))
    expect(r.email_is_placeholder).toBe(true)
    expect(r.warning).toBeNull()
  })

  it('feuille VIDE + HOMONYMES en base → repli placeholder + warning doux (pas de doublon hasardeux)', () => {
    const existing: MembershipLookup[] = [
      {
        id: 'm-1',
        user_id: 'u-1',
        full_name: 'DIALLO Mamadou',
        email: 'a@x.io',
        email_is_placeholder: false,
      },
      {
        id: 'm-2',
        user_id: 'u-2',
        full_name: 'DIALLO Mamadou',
        email: 'b@x.io',
        email_is_placeholder: false,
      },
    ]
    const r = resolveBaseEmail(
      mapped('DIALLO Mamadou', placeholder('diallo-mamadou'), true),
      true,
      existing
    )
    expect(r.email).toBe(placeholder('diallo-mamadou'))
    expect(r.email_is_placeholder).toBe(true)
    expect(r.warning).toMatch(/homonymes/i)
  })

  it('feuille VIDE + membre connu SANS email en base (cas limite) → placeholder mappé', () => {
    const existing: MembershipLookup[] = [
      {
        id: 'm-1',
        user_id: 'u-1',
        full_name: 'SANS Email',
        email: null,
        email_is_placeholder: false,
      },
    ]
    const r = resolveBaseEmail(
      mapped('SANS Email', placeholder('sans-email'), true),
      true,
      existing
    )
    expect(r.email).toBe(placeholder('sans-email'))
  })

  it('idempotence : 2 résolutions consécutives (feuille vide, vrai email en base) → même email', () => {
    const existing: MembershipLookup[] = [
      {
        id: 'm-1',
        user_id: 'u-1',
        full_name: 'OURO SAMA Jalil',
        email: 'jalil@gmail.com',
        email_is_placeholder: false,
      },
    ]
    const arg = mapped('OURO SAMA Jalil', placeholder('ouro-sama-jalil'), true)
    const a = resolveBaseEmail(arg, true, existing)
    const b = resolveBaseEmail(arg, true, existing)
    expect(a.email).toBe(b.email)
    expect(a.email).toBe('jalil@gmail.com')
  })
})
