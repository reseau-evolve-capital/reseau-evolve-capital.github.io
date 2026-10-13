import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContactInfoSection } from './ContactInfoSection'
import type { ContactInfoSection as ContactInfoData } from '@/lib/content-types'
import type { ContactInfo } from '@/components/sections/registry'

const data: ContactInfoData = { __component: 'sections.contact-info', id: 1, anchorId: null }
const ctx = (contact: ContactInfo) => ({ locale: 'fr' as const, contact })

describe('ContactInfoSection', () => {
  it("ne rend pas l'adresse (commentee sur la vitrine actuelle)", () => {
    expect(renderToStaticMarkup(<ContactInfoSection data={data} ctx={ctx({ contactAddress: '32 bis rue du cotentin' })} />)).toBe('')
    const html = renderToStaticMarkup(<ContactInfoSection data={data} ctx={ctx({ contactEmail: 'a@b.fr', contactAddress: '32 bis rue du cotentin' })} />)
    expect(html).toContain('a@b.fr')
    expect(html).not.toContain('32 bis rue')
  })

  it('ne rend rien sans coordonnees ni reseaux', () => {
    expect(renderToStaticMarkup(<ContactInfoSection data={data} ctx={ctx({})} />)).toBe('')
  })
})
