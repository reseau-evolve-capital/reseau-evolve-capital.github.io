import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('./components', () => ({ SECTION_COMPONENTS: {} }))

const { SectionRenderer } = await import('./SectionRenderer')
const { ContentError } = await import('@/lib/content')

describe('SectionRenderer', () => {
  it('leve une ContentError si un type enregistre n’a pas de composant', () => {
    const items = [{ section: { __component: 'sections.join', id: 1, anchorId: null } as never, ctx: { locale: 'fr' as const } }]
    expect(() => renderToStaticMarkup(<SectionRenderer items={items} locale="fr" />)).toThrow(ContentError)
  })
})
