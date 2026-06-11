import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { brand, semantic } from '@evolve/design-system'
import { EvolveEmailShell, MagicLinkEmail, renderEmailHtml } from '../emails/index.ts'

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

  it('hideUnsubscribe retire le lien de désinscription (emails transactionnels)', async () => {
    const html = await renderEmailHtml(
      createElement(EvolveEmailShell, {
        preview: 'Aperçu',
        hideUnsubscribe: true,
        children: createElement('p', null, 'Contenu'),
      })
    )
    // Plus de lien de désinscription ni de token Brevo…
    expect(html).not.toMatch(/désinscrire/i)
    expect(html).not.toContain('{{unsubscribe}}')
    // …mais les mentions légales demeurent (→ /legal/charter).
    expect(html).toMatch(/mentions légales/i)
    expect(html).toContain('/legal/charter')
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
  const magicLink = 'https://app.evolve.capital/login/verify?code=abc-123'
  const expiresInMin = 15

  it('FR (défaut) : logo, lien magique, durée, titre FR', async () => {
    const html = await renderEmailHtml(createElement(MagicLinkEmail, { magicLink, expiresInMin }))
    expect(html).toMatch(/EVOLVE/i)
    expect(html).toContain(magicLink)
    expect(html).toContain('Connexion à Evolve Capital')
    expect(html).toContain(String(expiresInMin))
    // CTA FR.
    expect(html).toContain('Se connecter')
  })

  it('EN : titre, CTA et copy anglaise + lien magique', async () => {
    const html = await renderEmailHtml(
      createElement(MagicLinkEmail, { magicLink, expiresInMin, locale: 'en' })
    )
    expect(html).toContain(magicLink)
    expect(html).toContain('Sign in to Evolve Capital')
    expect(html).toContain('Sign in')
    expect(html).toContain(String(expiresInMin))
    // Pas de copy FR résiduelle dans la version EN.
    expect(html).not.toContain('Connexion à Evolve Capital')
  })

  it('LIEN UNIQUEMENT (A7) : aucun code/OTP affiché, ni fr ni en', async () => {
    for (const locale of ['fr', 'en'] as const) {
      const html = await renderEmailHtml(
        createElement(MagicLinkEmail, { magicLink, expiresInMin, locale })
      )
      // Aucune invite à saisir un code (FR/EN), aucune mention de code/OTP.
      expect(html.toLowerCase()).not.toMatch(/enter the code|saisis le code|saisir le code/)
      expect(html.toLowerCase()).not.toMatch(/\bcode otp\b|\bcode de vérification\b|one-?time code/)
      // Aucun placeholder de template Supabase (Token/Code) ne doit fuiter.
      expect(html).not.toContain('{{ .Token }}')
      expect(html).not.toContain('{{ .Code }}')
      // Aucun bloc de 6 chiffres isolé (forme d'un OTP) hors de l'URL du lien.
      const rendered = html.replace(/<[^>]+>/g, ' ').replace(magicLink, ' ')
      expect(rendered).not.toMatch(/(?<!\d)\d{6}(?!\d)/)
    }
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
    // L'URL apparaît au moins deux fois : le href du CTA + le texte backup copiable.
    const occurrences = html.split(magicLink).length - 1
    expect(occurrences).toBeGreaterThanOrEqual(2)
    // L'apostrophe est échappée en entité HTML (&#x27;) par React Email.
    expect(html).toMatch(/Tu n(?:'|&#x27;)as pas demandé ce lien/i)
  })

  it('backup en TEXTE BRUT, jamais une ancre cliquable (anti-prefetch long-press iOS)', async () => {
    const html = await renderEmailHtml(createElement(MagicLinkEmail, { magicLink, expiresInMin }))
    // Sur iOS, un long-press pour copier une ANCRE ouvre un aperçu qui prefetch
    // l'URL et consomme le lien à usage unique avant même le clic. Le backup doit
    // donc être du texte : une SEULE ancre pointe vers le magic link — le CTA.
    const escaped = magicLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const anchorsToMagicLink = html.match(new RegExp(`<a\\b[^>]*href="${escaped}"`, 'g')) ?? []
    expect(anchorsToMagicLink).toHaveLength(1)
    // …mais l'URL reste affichée en clair (copiable) dans le corps.
    expect(html).toContain(magicLink)
  })
})
