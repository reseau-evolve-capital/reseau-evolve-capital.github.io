import { describe, expect, it, vi } from 'vitest'
import { RULES, hasItems, isRenderable } from './registry'
import { SECTION_COMPONENTS } from './components'
import { SECTION_POPULATE } from '@/lib/populate'

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
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(isRenderable({ __component: 'sections.contact-form', id: 1, formFields: [] } as never, ctx)).toBe(false)
    warn.mockRestore()
  })
  it('contact-form sans un des champs exiges par validateContactForm -> non rendue, avec avertissement', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fields = (names: string[]) => ({ __component: 'sections.contact-form', id: 1, formFields: names.map((name) => ({ name })) }) as never
    expect(isRenderable(fields(['name', 'email', 'message', 'newsletter']), ctx)).toBe(false)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('subject'))
    expect(isRenderable(fields(['name', 'email', 'subject', 'message', 'newsletter']), ctx)).toBe(true)
    warn.mockRestore()
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

describe('parite des tables de sections', () => {
  it('populate, regles et composants couvrent les memes types sections.*', () => {
    const rules = Object.keys(RULES).sort()
    expect(Object.keys(SECTION_COMPONENTS).sort()).toEqual(rules)
    expect(Object.keys(SECTION_POPULATE).filter((k) => k.startsWith('sections.')).sort()).toEqual(rules)
  })
  it('populate ne contient que des sections.* et des blocs.*', () => {
    expect(Object.keys(SECTION_POPULATE).every((k) => k.startsWith('sections.') || k.startsWith('blocs.'))).toBe(true)
  })
})
