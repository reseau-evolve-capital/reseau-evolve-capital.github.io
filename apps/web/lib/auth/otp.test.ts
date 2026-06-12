// Tests unitaires — logique pure de la connexion par code OTP (fix PWA juin).
// Couche la plus basse (Vitest node, pas de RTL dans apps/web) : le composant
// OtpForm ne fait que câbler ces fonctions sur supabase.auth.verifyOtp.

import { describe, expect, it } from 'vitest'

import {
  isCompleteOtpCode,
  otpErrorKey,
  sanitizeOtpCode,
  verifyEmailOtp,
  type OtpAuthClient,
  type OtpVerifyError,
} from './otp'

describe('sanitizeOtpCode', () => {
  it('ne garde que les chiffres et tronque à 6', () => {
    expect(sanitizeOtpCode('482913')).toBe('482913')
    expect(sanitizeOtpCode(' 48 29 13 ')).toBe('482913')
    expect(sanitizeOtpCode('482-913')).toBe('482913')
    expect(sanitizeOtpCode('4829137777')).toBe('482913')
    expect(sanitizeOtpCode('abc')).toBe('')
    expect(sanitizeOtpCode('')).toBe('')
  })
})

describe('isCompleteOtpCode', () => {
  it('valide exactement 6 chiffres', () => {
    expect(isCompleteOtpCode('482913')).toBe(true)
    expect(isCompleteOtpCode('48291')).toBe(false)
    expect(isCompleteOtpCode('4829131')).toBe(false)
    expect(isCompleteOtpCode('48291a')).toBe(false)
    expect(isCompleteOtpCode('')).toBe(false)
  })
})

describe('otpErrorKey', () => {
  it('code faux/expiré (otp_expired, validation_failed, 4xx auth) → errorInvalid', () => {
    expect(otpErrorKey({ code: 'otp_expired', status: 403 })).toBe('errorInvalid')
    expect(otpErrorKey({ code: 'validation_failed', status: 400 })).toBe('errorInvalid')
    expect(otpErrorKey({ status: 400 })).toBe('errorInvalid')
    expect(otpErrorKey({ status: 401 })).toBe('errorInvalid')
    expect(otpErrorKey({ status: 403 })).toBe('errorInvalid')
  })

  it('rate limit / 5xx / inconnu → errorGeneric', () => {
    expect(otpErrorKey({ code: 'over_request_rate_limit', status: 429 })).toBe('errorGeneric')
    expect(otpErrorKey({ status: 500 })).toBe('errorGeneric')
    expect(otpErrorKey({})).toBe('errorGeneric')
    expect(otpErrorKey(null)).toBe('errorGeneric')
    expect(otpErrorKey(undefined)).toBe('errorGeneric')
  })
})

describe('verifyEmailOtp', () => {
  function makeAuth(error: OtpVerifyError | null = null) {
    const calls: { email: string; token: string; type: string }[] = []
    const auth: OtpAuthClient = {
      verifyOtp: (params) => {
        calls.push(params)
        return Promise.resolve({ error })
      },
    }
    return { auth, calls }
  }

  it('succès : appelle verifyOtp avec email trimé, code nettoyé, type email', async () => {
    const { auth, calls } = makeAuth()
    const res = await verifyEmailOtp(auth, '  lea@club.fr ', ' 48 29 13')
    expect(res).toEqual({ ok: true })
    expect(calls).toEqual([{ email: 'lea@club.fr', token: '482913', type: 'email' }])
  })

  it('code incomplet : errorInvalid SANS appel réseau', async () => {
    const { auth, calls } = makeAuth()
    const res = await verifyEmailOtp(auth, 'lea@club.fr', '123')
    expect(res).toEqual({ ok: false, errorKey: 'errorInvalid' })
    expect(calls).toHaveLength(0)
  })

  it('erreur Supabase otp_expired → errorInvalid', async () => {
    const { auth } = makeAuth({ code: 'otp_expired', status: 403 })
    const res = await verifyEmailOtp(auth, 'lea@club.fr', '482913')
    expect(res).toEqual({ ok: false, errorKey: 'errorInvalid' })
  })

  it('throw réseau → errorGeneric, jamais de crash', async () => {
    const auth: OtpAuthClient = {
      verifyOtp: () => Promise.reject(new Error('network down')),
    }
    const res = await verifyEmailOtp(auth, 'lea@club.fr', '482913')
    expect(res).toEqual({ ok: false, errorKey: 'errorGeneric' })
  })
})
