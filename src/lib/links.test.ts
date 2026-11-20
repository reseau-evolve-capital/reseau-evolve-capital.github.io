import { describe, expect, it } from 'vitest'
import { isExternal, localeHref, resolveLinks, safeHref } from './links'

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
  it('ajoute le slash initial manquant aux liens internes, laisse les externes tels quels', () => {
    const links = [
      { label: 'A propos', href: 'about' }, { label: 'Mail', href: 'mailto:a@b.fr' }, { label: 'Tel', href: 'tel:+33100000000' },
    ]
    expect(resolveLinks(links, slugs).map((l) => l.href)).toEqual(['/about', 'mailto:a@b.fr', 'tel:+33100000000'])
  })
})

describe('isExternal', () => {
  it('http, https, mailto, tel externes ; chemins internes non', () => {
    expect(['http://x.fr', 'HTTPS://x.fr', 'mailto:a@b.fr', 'tel:+331'].every(isExternal)).toBe(true)
    expect(['/about', 'about', '/#clubs', '//x'].some(isExternal)).toBe(false)
  })
})

describe('localeHref', () => {
  it('prefixe la langue sur un lien interne, avec ou sans slash initial', () => {
    expect(localeHref('fr', '/about')).toBe('/fr/about')
    expect(localeHref('fr', 'about')).toBe('/fr/about')
  })
  it('laisse un lien absolu tel quel', () => {
    expect(localeHref('en', 'https://helloasso.com/x')).toBe('https://helloasso.com/x')
  })
})

describe('safeHref', () => {
  it('garde http(s), mailto, tel et chemins internes', () => {
    for (const href of ['https://linkedin.com/x', 'http://x.fr', 'mailto:a@b.fr', 'tel:+331', '/fr/contact']) expect(safeHref(href)).toBe(href)
  })
  it('ecarte javascript:, data:, URL sans schema, protocol-relative et vide', () => {
    for (const href of ['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,x', 'linkedin.com/company/x', '//evil.fr', '/\\evil.fr', ' https://x.fr', '', null, undefined]) {
      expect(safeHref(href)).toBeNull()
    }
  })
})
