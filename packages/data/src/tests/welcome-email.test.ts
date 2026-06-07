import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { brand, semantic } from '@evolve/design-system'
import { WelcomeEmail } from '../emails/WelcomeEmail.tsx'
import { renderEmailHtml } from '../emails/index.ts'

describe('WelcomeEmail', () => {
  const props = {
    memberFirstName: 'Louis',
    clubName: 'Les Investisseurs Audacieux',
  }

  it('contient le logo, le prénom du membre et le nom du club', async () => {
    const html = await renderEmailHtml(createElement(WelcomeEmail, props))
    expect(html).toMatch(/EVOLVE/i)
    // React Email insère des marqueurs <!-- --> entre nœuds texte : motif tolérant.
    expect(html).toMatch(/Bienvenue\s*(?:<!-- -->)?\s*Louis/)
    expect(html).toContain('Les Investisseurs Audacieux')
  })

  it('présente les 3 sections de prise en main', async () => {
    const html = await renderEmailHtml(createElement(WelcomeEmail, props))
    expect(html).toMatch(/Tableau de bord/i)
    expect(html).toMatch(/Portefeuille du club/i)
    expect(html).toMatch(/cotisations? (?:&amp;|&|et) attestation/i)
  })

  it('expose un CTA « Accéder à mon espace » pointant vers /dashboard', async () => {
    const html = await renderEmailHtml(createElement(WelcomeEmail, props))
    expect(html).toContain('Accéder à mon espace')
    // CTA pointe vers le dashboard de l'app par défaut.
    expect(html).toContain('https://app.evolve.capital/dashboard')
  })

  it('respecte appUrl quand fourni (CTA → {appUrl}/dashboard)', async () => {
    const html = await renderEmailHtml(
      createElement(WelcomeEmail, { ...props, appUrl: 'https://staging.evolve.capital' })
    )
    expect(html).toContain('https://staging.evolve.capital/dashboard')
  })

  it('utilise un CTA jaune (brand.yellow), encre accent, jamais brand.red', async () => {
    const html = await renderEmailHtml(createElement(WelcomeEmail, props))
    expect(html.toLowerCase()).toContain(brand.yellow.toLowerCase())
    expect(html.toLowerCase()).toContain(semantic.accentInk.toLowerCase())
    expect(html.toLowerCase()).not.toContain(brand.red.toLowerCase())
  })

  it('retombe sur « — » quand prénom et club sont vides (jamais undefined)', async () => {
    const html = await renderEmailHtml(
      createElement(WelcomeEmail, { memberFirstName: '', clubName: '' })
    )
    expect(html).not.toContain('undefined')
    // Le titre conserve un fallback lisible « — » (React Email insère des marqueurs
    // de commentaire <!-- --> entre les nœuds texte, d'où le motif tolérant).
    expect(html).toMatch(/Bienvenue\s*(?:<!-- -->)?\s*(?:—|&mdash;)/)
  })
})
