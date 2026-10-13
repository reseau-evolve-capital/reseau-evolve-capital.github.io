import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContentError, assertSiteContent, getClub, getPage } from './content'

afterEach(() => vi.unstubAllGlobals())
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
const g = { siteName: 'REC' } as never

describe('assertSiteContent', () => {
  it('passe quand accueil et réglages existent dans chaque locale', () => {
    expect(() => assertSiteContent({ pages: { fr: [{ slug: 'index' }], en: [{ slug: 'index' }] }, global: { fr: g, en: g } })).not.toThrow()
  })
  it('lève si l’accueil manque dans une locale', () => {
    expect(() => assertSiteContent({ pages: { fr: [{ slug: 'index' }], en: [{ slug: 'about' }] }, global: { fr: g, en: g } })).toThrow(/accueil.*en/)
  })
  it('lève si les réglages manquent', () => {
    expect(() => assertSiteContent({ pages: { fr: [{ slug: 'index' }], en: [{ slug: 'index' }] }, global: { fr: g, en: null } })).toThrow(ContentError)
  })
  it('lève sur un slug en double', () => {
    expect(() => assertSiteContent({ pages: { fr: [{ slug: 'index' }, { slug: 'a' }, { slug: 'a' }], en: [{ slug: 'index' }] }, global: { fr: g, en: g } })).toThrow(/double.*a/)
  })
})

describe('getPage', () => {
  it('renvoie null si la page n’existe pas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ data: [] })))
    await expect(getPage('nope', 'fr')).resolves.toBeNull()
  })
  it('normalise les répétables null en tableaux vides', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ data: [{ documentId: 'd', slug: 'index', title: 'A', seo: null, sections: [{ __component: 'sections.introduction', id: 1, title: 'T', stats: null }] }] })))
    const page = await getPage('index', 'fr')
    expect(page?.sections[0]).toMatchObject({ stats: [] })
  })
  it('normalise formFields et options du formulaire de contact', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ data: [{ documentId: 'd', slug: 'contact', title: 'C', seo: null, sections: [{ __component: 'sections.contact-form', id: 1, title: 'T', formFields: [{ name: 'a', options: null }] }] }] })))
    const page = await getPage('contact', 'fr')
    expect(page?.sections[0]).toMatchObject({ formFields: [{ name: 'a', options: [] }] })
  })
})

describe('getClub', () => {
  it('garde members (effectif) null et normalise les répétables du club', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ data: [{ documentId: 'd', slug: 'c', name: 'C', members: null, performance: null, faq: null }] })))
    const club = await getClub('c', 'fr')
    expect(club).toMatchObject({ members: null, performance: [], faq: [] })
  })
})
