import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { brand, dataViz } from '@evolve/design-system'
import { SyncErrorEmail } from '../emails/SyncErrorEmail'
import { renderEmailHtml } from '../emails'

describe('SyncErrorEmail', () => {
  const props = {
    clubName: 'Cercle Arago',
    syncTime: new Date('2026-06-05T09:32:00Z'),
    errorMessage: 'Colonne « Prix de revient » introuvable dans la feuille Portefeuille',
  }

  it('contient le logo, le nom du club et le message lisible', async () => {
    const html = await renderEmailHtml(createElement(SyncErrorEmail, props))
    expect(html).toMatch(/EVOLVE/i)
    expect(html).toContain('Cercle Arago')
    expect(html).toMatch(/Prix de revient/)
    expect(html).toMatch(/Erreur de synchronisation/i)
  })

  it('expose un CTA « Aller dans l’admin » pointant vers /admin?tab=sync', async () => {
    const html = await renderEmailHtml(createElement(SyncErrorEmail, props))
    expect(html).toMatch(/Aller dans l(?:'|&#x27;)admin/i)
    expect(html).toContain('/admin?tab=sync')
    // Défaut : l'app de production.
    expect(html).toContain('https://app.evolve.capital/admin?tab=sync')
  })

  it('respecte appUrl quand fourni (CTA → {appUrl}/admin?tab=sync)', async () => {
    const html = await renderEmailHtml(
      createElement(SyncErrorEmail, { ...props, appUrl: 'https://staging.evolve.capital' })
    )
    expect(html).toContain('https://staging.evolve.capital/admin?tab=sync')
  })

  it('mentionne que l’alerte est envoyée au(x) trésorier(s)', async () => {
    const html = await renderEmailHtml(createElement(SyncErrorEmail, props))
    expect(html).toMatch(/trésorier/i)
  })

  it('utilise l’accent WARNING (token dataViz), JAMAIS brand.red', async () => {
    const html = await renderEmailHtml(createElement(SyncErrorEmail, props))
    // L'accent du titre / encart d'erreur porte le token warning (ambre foncé AA-safe).
    expect(html.toLowerCase()).toContain(dataViz.warningStrong.toLowerCase())
    // brand.red (#E93E3A) est strictement réservé au branding — jamais sur ce flux.
    expect(html.toLowerCase()).not.toContain(brand.red.toLowerCase())
  })

  it('formate l’horodatage en date/heure FR', async () => {
    const html = await renderEmailHtml(createElement(SyncErrorEmail, props))
    // Intl fr-FR : « 5 juin 2026 à … » (le mois en toutes lettres atteste du format FR).
    expect(html).toMatch(/juin\s+2026/)
  })

  it('retombe sur « — » quand club et message sont vides (jamais undefined)', async () => {
    const html = await renderEmailHtml(
      createElement(SyncErrorEmail, { clubName: '', syncTime: '', errorMessage: '' })
    )
    expect(html).not.toContain('undefined')
    // Fallback lisible dans le corps.
    expect(html).toMatch(/—|&mdash;/)
  })
})
