import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrapiError, strapiGet } from './strapi-fetch'

afterEach(() => vi.unstubAllGlobals())

describe('strapiGet', () => {
  it('renvoie le JSON et sérialise la requête', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [1] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(strapiGet('/pages', { locale: 'fr', filters: { slug: { $eq: 'index' } } })).resolves.toEqual({ data: [1] })
    expect(String(fetchMock.mock.calls[0][0])).toContain('/pages?locale=fr&filters[slug][$eq]=index')
  })
  it('lève sur une réponse 500', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })))
    await expect(strapiGet('/global')).rejects.toBeInstanceOf(StrapiError)
  })
  it('lève sur une erreur réseau', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    await expect(strapiGet('/global')).rejects.toThrow(/injoignable/)
  })
})
