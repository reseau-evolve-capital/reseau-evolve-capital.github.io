import { describe, expect, it } from 'vitest'
import { getStaticPageParams, pageExistsIn } from './site-content'

const pages = { fr: [{ slug: 'index' }, { slug: 'about' }, { slug: 'test-editeur' }, { slug: 'legal/terms' }], en: [{ slug: 'index' }, { slug: 'about' }, { slug: 'legal/terms' }] }

describe('getStaticPageParams', () => {
  it('accueil = slug vide, slugs imbriqués découpés, une locale par page existante', () => {
    expect(getStaticPageParams(pages)).toEqual([
      { locale: 'fr', slug: [] }, { locale: 'fr', slug: ['about'] }, { locale: 'fr', slug: ['test-editeur'] }, { locale: 'fr', slug: ['legal', 'terms'] },
      { locale: 'en', slug: [] }, { locale: 'en', slug: ['about'] }, { locale: 'en', slug: ['legal', 'terms'] },
    ])
  })
})

describe('pageExistsIn', () => {
  it('page fr seule', () => {
    expect(pageExistsIn(pages, 'test-editeur')).toEqual(['fr'])
    expect(pageExistsIn(pages, 'about')).toEqual(['fr', 'en'])
  })
})
