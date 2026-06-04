import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { brand, semantic } from '@evolve/design-system'
import { EvolveEmailShell, MagicLinkEmail, renderEmailHtml } from '../emails'

describe('renderEmailHtml', () => {
  it('rend un élément React Email en HTML string', async () => {
    const html = await renderEmailHtml(
      createElement(EvolveEmailShell, {
        preview: 'Aperçu',
        children: createElement('p', null, 'Contenu'),
      })
    )
    expect(typeof html).toBe('string')
    expect(html).toContain('<!DOCTYPE')
  })
})

describe('EvolveEmailShell', () => {
  it('contient le logo Evolve et le footer RGPD réutilisable', async () => {
    const html = await renderEmailHtml(
      createElement(EvolveEmailShell, {
        preview: 'Aperçu',
        children: createElement('p', null, 'Contenu'),
      })
    )
    // Logo / marque
    expect(html).toMatch(/EVOLVE/i)
    // Footer RGPD : marque + adresse + désinscription + mentions légales
    expect(html).toContain('Evolve Capital SAS')
    expect(html).toMatch(/désinscrire/i)
    expect(html).toMatch(/mentions légales/i)
  })

  it('rend le preview text passé en prop', async () => {
    const html = await renderEmailHtml(
      createElement(EvolveEmailShell, {
        preview: 'Mon aperçu unique',
        children: createElement('p', null, 'Contenu'),
      })
    )
    expect(html).toContain('Mon aperçu unique')
  })
})

describe('MagicLinkEmail', () => {
  const magicLink = 'https://app.evolve.capital/auth/magic?token=abc-123'
  const expiresInMin = 15

  it('contient le logo, le lien magique et la durée de validité', async () => {
    const html = await renderEmailHtml(createElement(MagicLinkEmail, { magicLink, expiresInMin }))
    expect(html).toMatch(/EVOLVE/i)
    expect(html).toContain(magicLink)
    expect(html).toContain('Connexion à Evolve Capital')
    expect(html).toContain(String(expiresInMin))
  })

  it('utilise un CTA jaune (token brand-yellow), texte encre, jamais brand.red', async () => {
    const html = await renderEmailHtml(createElement(MagicLinkEmail, { magicLink, expiresInMin }))
    // Le CTA porte la couleur de fond brand-yellow et l'encre accent.
    expect(html.toLowerCase()).toContain(brand.yellow.toLowerCase())
    expect(html.toLowerCase()).toContain(semantic.accentInk.toLowerCase())
    // brand.red est strictement réservé au branding, jamais sur ce flux.
    expect(html.toLowerCase()).not.toContain(brand.red.toLowerCase())
  })

  it('expose le lien en clair (backup plaintext) et un ton rassurant', async () => {
    const html = await renderEmailHtml(createElement(MagicLinkEmail, { magicLink, expiresInMin }))
    // Lien backup en clair (apparaît au moins deux fois : href + texte).
    const occurrences = html.split(magicLink).length - 1
    expect(occurrences).toBeGreaterThanOrEqual(2)
    // L'apostrophe est échappée en entité HTML (&#x27;) par React Email.
    expect(html).toMatch(/Tu n(?:'|&#x27;)as pas demandé ce lien/i)
  })
})
