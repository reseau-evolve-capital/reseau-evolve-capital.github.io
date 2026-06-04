import { describe, it, expect } from 'vitest'
import { effectiveInvitationStatus, canResendInvitation, canRevokeInvitation } from './invitations'

describe('effectiveInvitationStatus', () => {
  const now = new Date('2026-06-04T12:00:00Z')

  it('pending non échu reste pending', () => {
    expect(effectiveInvitationStatus('pending', '2026-06-05T12:00:00Z', now)).toBe('pending')
  })
  it('pending échu devient expired (calcul à la lecture, sans job de balayage)', () => {
    expect(effectiveInvitationStatus('pending', '2026-06-03T12:00:00Z', now)).toBe('expired')
  })
  it('accepted reste accepted même après échéance', () => {
    expect(effectiveInvitationStatus('accepted', '2026-06-01T12:00:00Z', now)).toBe('accepted')
  })
  it('revoked reste revoked', () => {
    expect(effectiveInvitationStatus('revoked', '2026-06-10T12:00:00Z', now)).toBe('revoked')
  })
})

describe('canResendInvitation', () => {
  it('autorise pending et expired', () => {
    expect(canResendInvitation('pending')).toBe(true)
    expect(canResendInvitation('expired')).toBe(true)
  })
  it('interdit accepted et revoked', () => {
    expect(canResendInvitation('accepted')).toBe(false)
    expect(canResendInvitation('revoked')).toBe(false)
  })
})

describe('canRevokeInvitation', () => {
  it('uniquement sur une invitation en attente', () => {
    expect(canRevokeInvitation('pending')).toBe(true)
    expect(canRevokeInvitation('expired')).toBe(false)
    expect(canRevokeInvitation('accepted')).toBe(false)
    expect(canRevokeInvitation('revoked')).toBe(false)
  })
})
