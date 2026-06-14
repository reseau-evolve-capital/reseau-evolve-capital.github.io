import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted garantit que le mock est en place avant l'import du module testé
const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: mocks.captureException,
}))

import { captureRouteError, captureActionError, captureClientError } from './sentry'

describe('sentry monitoring helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // captureRouteError
  // ---------------------------------------------------------------------------

  describe('captureRouteError', () => {
    it('appelle captureException avec le tag endpoint', () => {
      const err = new Error('boom')
      captureRouteError(err, { endpoint: '/api/sync' })

      expect(mocks.captureException).toHaveBeenCalledOnce()
      const [, opts] = mocks.captureException.mock.calls[0]!
      expect(opts.tags).toEqual({ endpoint: '/api/sync' })
    })

    it('inclut user.id si userId fourni', () => {
      const err = new Error('unauthorized')
      captureRouteError(err, { endpoint: '/api/dashboard', userId: 'uuid-123' })

      const [, opts] = mocks.captureException.mock.calls[0]!
      expect(opts.user).toEqual({ id: 'uuid-123' })
    })

    it("n'inclut pas user si userId absent", () => {
      captureRouteError(new Error('nope'), { endpoint: '/api/health' })

      const [, opts] = mocks.captureException.mock.calls[0]!
      expect(opts.user).toBeUndefined()
    })

    it('transmet le champ extra si fourni', () => {
      captureRouteError(new Error('extra'), {
        endpoint: '/api/sync',
        extra: { club_id: 'club-42' },
      })

      const [, opts] = mocks.captureException.mock.calls[0]!
      expect(opts.extra).toEqual({ club_id: 'club-42' })
    })

    it('ne casse pas si error est une string', () => {
      expect(() => captureRouteError('string error', { endpoint: '/api/foo' })).not.toThrow()
      expect(mocks.captureException).toHaveBeenCalledOnce()
    })

    it("passe l'erreur comme premier argument a captureException", () => {
      const err = new TypeError('type err')
      captureRouteError(err, { endpoint: '/api/portfolio' })

      const [capturedErr] = mocks.captureException.mock.calls[0]!
      expect(capturedErr).toBe(err)
    })
  })

  // ---------------------------------------------------------------------------
  // captureActionError
  // ---------------------------------------------------------------------------

  describe('captureActionError', () => {
    it('appelle captureException avec le tag action', () => {
      const err = new Error('db fail')
      captureActionError(err, { action: 'updateProfile' })

      expect(mocks.captureException).toHaveBeenCalledOnce()
      const [, opts] = mocks.captureException.mock.calls[0]!
      expect(opts.tags).toEqual({ action: 'updateProfile' })
    })

    it('inclut user.id si userId fourni', () => {
      captureActionError(new Error('action error'), {
        action: 'suspendMember',
        userId: 'uuid-456',
      })

      const [, opts] = mocks.captureException.mock.calls[0]!
      expect(opts.user).toEqual({ id: 'uuid-456' })
    })

    it("n'inclut pas user si userId absent", () => {
      captureActionError(new Error('nope'), { action: 'exportCSV' })

      const [, opts] = mocks.captureException.mock.calls[0]!
      expect(opts.user).toBeUndefined()
    })

    it('transmet le champ extra si fourni', () => {
      captureActionError(new Error('extra'), {
        action: 'inviteMember',
        extra: { club_id: 'club-1' },
      })

      const [, opts] = mocks.captureException.mock.calls[0]!
      expect(opts.extra).toEqual({ club_id: 'club-1' })
    })
  })

  // ---------------------------------------------------------------------------
  // captureClientError
  // ---------------------------------------------------------------------------

  describe('captureClientError', () => {
    it('appelle captureException avec le tag source', () => {
      const err = new Error('query fail')
      captureClientError(err, { source: 'usePortfolio' })

      expect(mocks.captureException).toHaveBeenCalledOnce()
      const [, opts] = mocks.captureException.mock.calls[0]!
      expect(opts.tags).toEqual({ source: 'usePortfolio' })
    })

    it('inclut queryKey dans extra si fourni', () => {
      captureClientError(new Error('rq err'), {
        source: 'useDashboard',
        queryKey: ['dashboard', 'club-1'],
      })

      const [, opts] = mocks.captureException.mock.calls[0]!
      expect(opts.extra).toMatchObject({ queryKey: ['dashboard', 'club-1'] })
    })

    it("n'inclut pas queryKey dans extra si undefined", () => {
      captureClientError(new Error('no key'), { source: 'useContributions' })

      const [, opts] = mocks.captureException.mock.calls[0]!
      expect(opts.extra).not.toHaveProperty('queryKey')
    })

    it('ne casse pas si error est null', () => {
      expect(() => captureClientError(null, { source: 'useAdmin' })).not.toThrow()
      expect(mocks.captureException).toHaveBeenCalledOnce()
    })

    it('fusionne queryKey et extra supplémentaire', () => {
      captureClientError(new Error('merge'), {
        source: 'usePortfolio',
        queryKey: ['portfolio'],
        extra: { club_id: 'club-7' },
      })

      const [, opts] = mocks.captureException.mock.calls[0]!
      expect(opts.extra).toEqual({ queryKey: ['portfolio'], club_id: 'club-7' })
    })
  })

  // ---------------------------------------------------------------------------
  // Comportement SDK — pas de no-op conditionnel dans le helper
  // ---------------------------------------------------------------------------

  describe('comportement délégation SDK', () => {
    it('chaque helper délègue systématiquement à captureException (pas de guard interne)', () => {
      captureRouteError(new Error('r'), { endpoint: '/api/a' })
      captureActionError(new Error('a'), { action: 'doSomething' })
      captureClientError(new Error('c'), { source: 'useX' })

      expect(mocks.captureException).toHaveBeenCalledTimes(3)
    })

    it("si captureException leve, le helper laisse l'erreur propager", () => {
      mocks.captureException.mockImplementationOnce(() => {
        throw new Error('SDK crash')
      })

      expect(() => captureRouteError(new Error('r'), { endpoint: '/api/b' })).toThrow('SDK crash')
    })
  })
})
