import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { brand, semantic } from '@evolve/design-system'
import { AttestationEmail } from '../emails/AttestationEmail'
import { renderEmailHtml } from '../emails'

describe('AttestationEmail', () => {
  const props = {
    memberFirstName: 'Louis',
    clubName: 'Les Investisseurs Audacieux',
    period: 'avril 2026',
    kpis: {
      detentionPct: '12,35 %',
      totalContributed: '4 200,00 €',
      quotePartValue: '5 130,40 €',
      portfolioValue: '41 540,00 €',
    },
  }

  it('contient le logo, le prénom du membre, le mois et le nom du club', async () => {
    const html = await renderEmailHtml(createElement(AttestationEmail, props))
    expect(html).toMatch(/EVOLVE/i)
    expect(html).toContain('Louis')
    expect(html).toContain('avril 2026')
    expect(html).toContain('Les Investisseurs Audacieux')
  })

  it('convertit une période canonique YYYY-MM en libellé FR (avril 2026)', async () => {
    // Le cron passe le format canonique « 2026-04 » → le composant doit afficher « avril 2026 ».
    const html = await renderEmailHtml(
      createElement(AttestationEmail, { ...props, period: '2026-04' })
    )
    expect(html).toContain('avril 2026')
    expect(html).not.toContain('2026-04')
    expect(html).toContain('attestation-avril-2026.pdf')
  })

  it('présente le récap des 4 chiffres clés (libellés + valeurs FR)', async () => {
    const html = await renderEmailHtml(createElement(AttestationEmail, props))
    expect(html).toMatch(/Parts détenues/i)
    expect(html).toMatch(/Cotisation totale/i)
    expect(html).toMatch(/Montant quote-part/i)
    expect(html).toMatch(/Valorisation portefeuille/i)
    // Les valeurs formatées FR (NBSP toléré) sont rendues.
    expect(html).toContain('12,35')
    expect(html).toContain('4')
    expect(html).toContain('200,00')
    expect(html).toContain('5')
    expect(html).toContain('130,40')
    expect(html).toContain('41')
    expect(html).toContain('540,00')
  })

  it('mentionne une pièce jointe PDF nommée par la période', async () => {
    const html = await renderEmailHtml(createElement(AttestationEmail, props))
    expect(html).toMatch(/Pièce jointe/i)
    expect(html).toContain('attestation-avril-2026.pdf')
  })

  it('expose un CTA « Ouvrir mon espace » pointant vers /contributions', async () => {
    const html = await renderEmailHtml(createElement(AttestationEmail, props))
    expect(html).toContain('Ouvrir mon espace')
    expect(html).toContain('https://app.evolve.capital/contributions')
  })

  it('respecte appUrl quand fourni (CTA → {appUrl}/contributions)', async () => {
    const html = await renderEmailHtml(
      createElement(AttestationEmail, { ...props, appUrl: 'https://staging.evolve.capital' })
    )
    expect(html).toContain('https://staging.evolve.capital/contributions')
  })

  it('utilise un CTA jaune (brand.yellow), encre accent, jamais brand.red', async () => {
    const html = await renderEmailHtml(createElement(AttestationEmail, props))
    expect(html.toLowerCase()).toContain(brand.yellow.toLowerCase())
    expect(html.toLowerCase()).toContain(semantic.accentInk.toLowerCase())
    expect(html.toLowerCase()).not.toContain(brand.red.toLowerCase())
  })

  it('retombe sur « — » quand les valeurs sont vides (jamais undefined)', async () => {
    const html = await renderEmailHtml(
      createElement(AttestationEmail, {
        memberFirstName: '',
        clubName: '',
        period: '',
        kpis: { detentionPct: '', totalContributed: '', quotePartValue: '', portfolioValue: '' },
      })
    )
    expect(html).not.toContain('undefined')
    expect(html).toMatch(/—|&mdash;/)
    // La pièce jointe garde un nom lisible même sans période.
    expect(html).toContain('attestation-detention.pdf')
  })
})
