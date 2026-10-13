import { describe, expect, it } from 'vitest'
import { resolveLinks } from './links'

const slugs = ['index', 'about', 'contact', 'legal/terms']

describe('resolveLinks', () => {
  it('garde les pages publiees, le blog, les clubs, les ancres et les URLs externes', () => {
    const links = [
      { label: 'Accueil', href: '/' }, { label: 'A propos', href: '/about' }, { label: 'Blog', href: '/blog' },
      { label: 'Club', href: '/clubs/evolve-capital' }, { label: 'Clubs', href: '/#clubs' },
      { label: 'Ressources', href: '/?activeResource=article#resources' }, { label: 'LinkedIn', href: 'https://linkedin.com/x' },
    ]
    expect(resolveLinks(links, slugs)).toEqual(links)
  })
  it('ecarte un lien vers une page non publiee', () => {
    expect(resolveLinks([{ label: 'FAQ', href: '/membership/faq' }], slugs)).toEqual([])
  })
})
