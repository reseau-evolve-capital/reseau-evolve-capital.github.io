import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContactInfoSection } from './ContactInfoSection'
import type { ContactInfoSection as ContactInfoData, GlobalDoc } from '@/lib/content-types'

const data: ContactInfoData = { __component: 'sections.contact-info', id: 1, anchorId: null }
const ctx = (global: Partial<GlobalDoc>) => ({ locale: 'fr' as const, clubs: [], global: global as GlobalDoc, isHome: false })

describe('ContactInfoSection', () => {
  it("rend l'adresse (icone MapPin) sans crash", () => {
    const html = renderToStaticMarkup(<ContactInfoSection data={data} ctx={ctx({ contactAddress: '32 bis rue du cotentin' })} />)
    expect(html).toContain('32 bis rue du cotentin')
    expect(html).not.toContain('Réseaux Sociaux')
  })

  it('ne rend rien sans coordonnees ni reseaux', () => {
    expect(renderToStaticMarkup(<ContactInfoSection data={data} ctx={ctx({})} />)).toBe('')
  })
})
