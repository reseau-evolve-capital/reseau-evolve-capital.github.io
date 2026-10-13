import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LegalPagePresentation } from './LegalPagePresentation'
import type { LegalSection } from '@/lib/content-types'

const data: LegalSection = {
  __component: 'sections.legal', id: 1, anchorId: null, title: 'Politique', lastUpdated: '2025-04-12',
  body: [
    { type: 'heading', level: 2, children: [{ type: 'text', text: 'Introduction' }] },
    { type: 'paragraph', children: [{ type: 'text', text: 'Bonjour', bold: true }] },
  ],
}

describe('LegalPagePresentation', () => {
  it('rend le corps en tableau de blocs avec les classes h2/p du legacy', () => {
    const html = renderToStaticMarkup(
      <LegalPagePresentation data={data} ctx={{ locale: 'fr', clubs: [], global: {} as never, isHome: false }} />,
    )
    expect(html).toContain('<h1')
    expect(html).toContain('Dernière mise à jour : 12/04/2025')
    expect(html).toMatch(/<h2 class="text-2xl font-heading[^"]*">Introduction<\/h2>/)
    expect(html).toContain('<p class="text-neutral-700 mb-4"><strong>Bonjour</strong></p>')
  })

  it('omet la date quand elle est vide', () => {
    const html = renderToStaticMarkup(
      <LegalPagePresentation data={{ ...data, lastUpdated: null }} ctx={{ locale: 'en', clubs: [], global: {} as never, isHome: false }} />,
    )
    expect(html).not.toContain('Last updated')
  })
})
