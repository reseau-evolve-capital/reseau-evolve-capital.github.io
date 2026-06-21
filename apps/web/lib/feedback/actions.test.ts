// Tests de la Server Action `submitFeedbackAction` (LOT D, multi-upload, spec §7).
//
// Couvre : (1) rejet sans auth (getUser → null → unauthorized, aucun insert) ;
//   (2) upload de N images (1..3) → N appels Storage + screenshot_urls de longueur N
//   (tableau text[], migration 036) ; (3) >3 images → tronqué à 3 ; (4) échec d'upload d'UNE
//   image → non fatal (les autres passent ; null si toutes échouent) ; (5) INSERT avec les
//   bons champs (sans image → screenshot_urls null) ; (6) entrée non-image ignorée.
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
  // Lecture memberships pour dériver feedback.club_id (NET-019). maybeSingle renvoie le club actif.
  membershipMaybeSingle: vi.fn(),
}))

// Builder memberships chainable (select → eq → eq → [eq] → [order] → [limit] → maybeSingle).
function membershipsBuilder() {
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'limit']) {
    builder[m] = () => builder
  }
  builder.maybeSingle = () => mocks.membershipMaybeSingle()
  return builder
}

vi.mock('@evolve/data', () => ({
  createServerClient: () => ({
    auth: { getUser: mocks.getUser },
    storage: {
      from: () => ({ upload: mocks.upload, createSignedUrl: mocks.createSignedUrl }),
    },
    from: (table: string) =>
      table === 'memberships' ? membershipsBuilder() : { insert: mocks.insert },
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
// Plus petit JPEG valide-ish en dataURL (octets bidon, suffisant pour le décodage base64).
const JPG_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='

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

/** Fait pointer createSignedUrl sur une URL distincte par appel (pour vérifier l'ordre/longueur). */
function signedUrlPerCall() {
  let n = 0
  mocks.createSignedUrl.mockImplementation(() => {
    n += 1
    return Promise.resolve({ data: { signedUrl: `https://signed.example/${n}.png` } })
  })
}

beforeEach(() => {
  mocks.getUser.mockReset()
  mocks.insert.mockReset()
  mocks.upload.mockReset()
  mocks.createSignedUrl.mockReset()
  mocks.membershipMaybeSingle.mockReset()
  // Par défaut, un membre authentifié, un INSERT et un upload qui réussissent.
  mocks.getUser.mockResolvedValue({ data: { user: USER } })
  mocks.insert.mockResolvedValue({ error: null })
  mocks.upload.mockResolvedValue({ error: null })
  // Par défaut : aucune adhésion active → club_id null (le test club_id dédié surcharge).
  mocks.membershipMaybeSingle.mockResolvedValue({ data: null })
})

describe('submitFeedbackAction', () => {
  it('rejette sans session (unauthorized) et n’insère rien', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const res = await submitFeedbackAction(makeSubmission({ imageDataUrls: [PNG_DATA_URL] }))

    expect(res).toEqual({ ok: false, error: 'unauthorized' })
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('uploade 1 image et pose screenshot_urls (tableau à 1 élément) sur l’INSERT', async () => {
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example/screenshots/abc.png' },
    })

    const res = await submitFeedbackAction(makeSubmission({ imageDataUrls: [PNG_DATA_URL] }))

    expect(res).toEqual({ ok: true })
    expect(mocks.upload).toHaveBeenCalledTimes(1)
    const [path, bytes, opts] = mocks.upload.mock.calls[0]!
    expect(path).toMatch(/^user-123\/.*\.png$/)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(opts).toEqual({ contentType: 'image/png' })
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        screenshot_urls: ['https://signed.example/screenshots/abc.png'],
      })
    )
  })

  it('uploade N images (ici 3) → 3 appels Storage + screenshot_urls de longueur 3', async () => {
    signedUrlPerCall()

    const res = await submitFeedbackAction(
      makeSubmission({ imageDataUrls: [PNG_DATA_URL, JPG_DATA_URL, PNG_DATA_URL] })
    )

    expect(res).toEqual({ ok: true })
    expect(mocks.upload).toHaveBeenCalledTimes(3)
    // L'extension/content-type suit le MIME : png pour 1 & 3, jpg pour la 2e.
    expect(mocks.upload.mock.calls[0]![0]).toMatch(/\.png$/)
    expect(mocks.upload.mock.calls[1]![0]).toMatch(/\.jpg$/)
    expect(mocks.upload.mock.calls[1]![2]).toEqual({ contentType: 'image/jpeg' })
    const inserted = mocks.insert.mock.calls[0]![0]
    expect(inserted.screenshot_urls).toHaveLength(3)
  })

  it('>3 images → tronqué à 3 (jamais de crash)', async () => {
    signedUrlPerCall()

    const res = await submitFeedbackAction(
      makeSubmission({
        imageDataUrls: [PNG_DATA_URL, PNG_DATA_URL, PNG_DATA_URL, PNG_DATA_URL, PNG_DATA_URL],
      })
    )

    expect(res).toEqual({ ok: true })
    expect(mocks.upload).toHaveBeenCalledTimes(3)
    expect(mocks.insert.mock.calls[0]![0].screenshot_urls).toHaveLength(3)
  })

  it('échec d’upload d’UNE image → non fatal : les autres passent', async () => {
    signedUrlPerCall()
    // 1re image échoue à l'upload, les 2 suivantes réussissent.
    mocks.upload
      .mockResolvedValueOnce({ error: { message: 'storage down' } })
      .mockResolvedValue({ error: null })

    const res = await submitFeedbackAction(
      makeSubmission({ imageDataUrls: [PNG_DATA_URL, PNG_DATA_URL, PNG_DATA_URL] })
    )

    expect(res).toEqual({ ok: true })
    expect(mocks.upload).toHaveBeenCalledTimes(3)
    // L'image échouée n'est pas signée → seulement 2 URLs signées.
    expect(mocks.createSignedUrl).toHaveBeenCalledTimes(2)
    expect(mocks.insert.mock.calls[0]![0].screenshot_urls).toHaveLength(2)
  })

  it('toutes les images échouent à l’upload → screenshot_urls null (non fatal)', async () => {
    mocks.upload.mockResolvedValue({ error: { message: 'storage down' } })

    const res = await submitFeedbackAction(
      makeSubmission({ imageDataUrls: [PNG_DATA_URL, PNG_DATA_URL] })
    )

    expect(res).toEqual({ ok: true })
    expect(mocks.upload).toHaveBeenCalledTimes(2)
    expect(mocks.createSignedUrl).not.toHaveBeenCalled()
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ screenshot_urls: null }))
  })

  it('entrée non-image (data URL non image) ignorée → pas d’upload', async () => {
    const res = await submitFeedbackAction(
      makeSubmission({ imageDataUrls: ['data:text/plain;base64,aGVsbG8=', 'pas-une-data-url'] })
    )

    expect(res).toEqual({ ok: true })
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ screenshot_urls: null }))
  })

  it('INSERT avec les bons champs (sans image → screenshot_urls null)', async () => {
    const res = await submitFeedbackAction(
      makeSubmission({ type: 'feature', message: 'Ajouter un export CSV' })
    )

    expect(res).toEqual({ ok: true })
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.insert).toHaveBeenCalledWith({
      user_id: USER.id,
      user_email: USER.email,
      club_id: null,
      type: 'feature',
      message: 'Ajouter un export CSV',
      screenshot_urls: null,
      page_url: 'http://localhost:3001/dashboard',
      page_route: '/dashboard',
      user_agent: 'jsdom',
    })
  })

  it('dérive feedback.club_id depuis l’adhésion active de l’auteur (NET-019)', async () => {
    mocks.membershipMaybeSingle.mockResolvedValue({ data: { club_id: 'club-abc' } })

    const res = await submitFeedbackAction(makeSubmission())

    expect(res).toEqual({ ok: true })
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ club_id: 'club-abc' }))
  })

  it('club_id null quand l’auteur n’a aucune adhésion active', async () => {
    mocks.membershipMaybeSingle.mockResolvedValue({ data: null })

    const res = await submitFeedbackAction(makeSubmission())

    expect(res).toEqual({ ok: true })
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ club_id: null }))
  })
})
