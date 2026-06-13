// Tests de la Server Action `submitFeedbackAction` (LOT D, spec §7).
//
// Couvre : (1) rejet sans auth (getUser → null → unauthorized, aucun insert) ;
//   (2) upload Storage appelé quand screenshotDataUrl présent + screenshot_url posé ;
//   (3) INSERT appelé avec les bons champs ; (4) upload qui échoue → insert quand même
//   avec screenshot_url = null (non fatal, spec §3).
//
// Mock du client Supabase serveur (cf. app/api/auth/magic-link/route.test.ts) : on remplace
// `createServerClient` (@evolve/data) et `cookies` (next/headers). Le client expose auth,
// storage.from().{upload,createSignedUrl} et from('feedback').insert.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FeedbackSubmission } from '@evolve/ui'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  insert: vi.fn(),
  upload: vi.fn(),
  createSignedUrl: vi.fn(),
}))

vi.mock('@evolve/data', () => ({
  createServerClient: () => ({
    auth: { getUser: mocks.getUser },
    storage: {
      from: () => ({ upload: mocks.upload, createSignedUrl: mocks.createSignedUrl }),
    },
    from: () => ({ insert: mocks.insert }),
  }),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => {} }),
}))

import { submitFeedbackAction } from './actions'

const USER = { id: 'user-123', email: 'lea@example.com' }
// Plus petit PNG valide en dataURL (1×1 transparent).
const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function makeSubmission(over: Partial<FeedbackSubmission> = {}): FeedbackSubmission {
  return {
    type: 'bug',
    message: 'Ça plante au login',
    pageUrl: 'http://localhost:3001/dashboard',
    pageRoute: '/dashboard',
    userAgent: 'jsdom',
    ...over,
  }
}

beforeEach(() => {
  mocks.getUser.mockReset()
  mocks.insert.mockReset()
  mocks.upload.mockReset()
  mocks.createSignedUrl.mockReset()
  // Par défaut, un membre authentifié et un INSERT qui réussit.
  mocks.getUser.mockResolvedValue({ data: { user: USER } })
  mocks.insert.mockResolvedValue({ error: null })
})

describe('submitFeedbackAction', () => {
  it('rejette sans session (unauthorized) et n’insère rien', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const res = await submitFeedbackAction(makeSubmission())

    expect(res).toEqual({ ok: false, error: 'unauthorized' })
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('uploade la capture et pose screenshot_url sur l’INSERT', async () => {
    mocks.upload.mockResolvedValue({ error: null })
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example/screenshots/abc.png' },
    })

    const res = await submitFeedbackAction(makeSubmission({ screenshotDataUrl: PNG_DATA_URL }))

    expect(res).toEqual({ ok: true })
    // Upload appelé sous le dossier de l'utilisateur, en image/png.
    expect(mocks.upload).toHaveBeenCalledTimes(1)
    const [path, bytes, opts] = mocks.upload.mock.calls[0]!
    expect(path).toMatch(/^user-123\/.*\.png$/)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(opts).toEqual({ contentType: 'image/png' })
    // URL signée stockée dans screenshot_url.
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ screenshot_url: 'https://signed.example/screenshots/abc.png' })
    )
  })

  it('INSERT avec les bons champs (sans capture → screenshot_url null)', async () => {
    const res = await submitFeedbackAction(
      makeSubmission({ type: 'feature', message: 'Ajouter un export CSV' })
    )

    expect(res).toEqual({ ok: true })
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.insert).toHaveBeenCalledWith({
      user_id: USER.id,
      user_email: USER.email,
      type: 'feature',
      message: 'Ajouter un export CSV',
      screenshot_url: null,
      page_url: 'http://localhost:3001/dashboard',
      page_route: '/dashboard',
      user_agent: 'jsdom',
    })
  })

  it('upload qui échoue → insert quand même avec screenshot_url null (non fatal)', async () => {
    mocks.upload.mockResolvedValue({ error: { message: 'storage down' } })

    const res = await submitFeedbackAction(makeSubmission({ screenshotDataUrl: PNG_DATA_URL }))

    expect(res).toEqual({ ok: true })
    expect(mocks.upload).toHaveBeenCalledTimes(1)
    // L'échec d'upload ne déclenche pas createSignedUrl.
    expect(mocks.createSignedUrl).not.toHaveBeenCalled()
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ screenshot_url: null }))
  })
})
