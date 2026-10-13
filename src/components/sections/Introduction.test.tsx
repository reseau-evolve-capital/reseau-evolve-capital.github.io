import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Introduction } from './Introduction'
import type { IntroductionSection } from '@/lib/content-types'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const ctx = { locale: 'fr', clubs: [], global: {} as never, isHome: true } as const

describe('Introduction', () => {
  it('rend le titre sans stats, description ni CTA quand ils sont vides', () => {
    const data: IntroductionSection = {
      __component: 'sections.introduction', id: 1, anchorId: null, title: 'Qui sommes-nous',
      description: null, stats: [], ctaLabel: null, ctaHref: null,
    }
    const html = renderToStaticMarkup(<Introduction data={data} ctx={ctx} />)
    expect(html).toContain('Qui sommes-nous')
    expect(html).not.toContain('grid-cols-2')
    expect(html).not.toContain('<button')
    expect(html).not.toContain('<p')
    expect(html).not.toMatch(/undefined|NaN/)
  })
})
