import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({ getAllArticles: async () => [], getAllCategories: async () => [] }))
vi.mock('@/lib/site-content', () => ({
  loadSiteContent: async () => ({
    pages: { fr: [{ slug: 'index', updatedAt: '2026-01-02T00:00:00.000Z' }], en: [{ slug: 'index', updatedAt: '2026-03-04T00:00:00.000Z' }] },
    clubs: { fr: [{ slug: 'a' }, { slug: 'fr-seul' }], en: [{ slug: 'a' }, { slug: 'en-seul' }] },
  }),
}))

const { default: sitemap } = await import('./sitemap')

describe('sitemap', () => {
  it('lastModified des pages = updatedAt Strapi de la langue', async () => {
    const entries = await sitemap()
    const home = (l: string) => entries.find((e) => e.url === `https://www.reseauevolvecapital.com/${l}`)
    expect(home('fr')?.lastModified).toEqual(new Date('2026-01-02T00:00:00.000Z'))
    expect(home('en')?.lastModified).toEqual(new Date('2026-03-04T00:00:00.000Z'))
  })
  it('clubs : union fr/en, alternates limitees aux langues ou le club existe', async () => {
    const clubs = (await sitemap()).filter((e) => e.url.includes('/clubs/'))
    expect(clubs.map((e) => [e.url.replace('https://www.reseauevolvecapital.com', ''), Object.keys(e.alternates?.languages ?? {})])).toEqual([
      ['/fr/clubs/a', ['fr', 'en']],
      ['/fr/clubs/fr-seul', ['fr']],
      ['/en/clubs/en-seul', ['en']],
    ])
  })
})
