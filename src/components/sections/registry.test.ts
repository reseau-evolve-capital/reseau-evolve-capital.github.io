import { describe, expect, it } from 'vitest'
import { hasItems, isRenderable } from './registry'

const ctx = { locale: 'fr' } as const

describe('isRenderable', () => {
  it('section events vide -> non rendue', () => {
    expect(isRenderable({ __component: 'sections.events', id: 1, events: [] } as never, ctx)).toBe(false)
  })
  it('introduction sans stats -> rendue (texte seul)', () => {
    expect(isRenderable({ __component: 'sections.introduction', id: 1, title: 'T', stats: [] } as never, ctx)).toBe(true)
  })
  it('featured-clubs sans club en avant -> non rendue', () => {
    expect(isRenderable({ __component: 'sections.featured-clubs', id: 1, title: 'C' } as never, ctx)).toBe(false)
  })
  it('contact-form sans formFields -> non rendue', () => {
    expect(isRenderable({ __component: 'sections.contact-form', id: 1, formFields: [] } as never, ctx)).toBe(false)
  })
  it('type inconnu -> non rendu', () => {
    expect(isRenderable({ __component: 'sections.inconnue', id: 1 } as never, ctx)).toBe(false)
  })
})

describe('hasItems', () => {
  it('null, vide, plein', () => {
    expect(hasItems(null)).toBe(false)
    expect(hasItems([])).toBe(false)
    expect(hasItems([1])).toBe(true)
  })
})
