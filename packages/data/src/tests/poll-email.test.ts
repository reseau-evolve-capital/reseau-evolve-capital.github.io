import { describe, expect, it } from 'vitest'
import { brand, dataViz } from '@evolve/design-system'
import { renderPollEmailHtml } from '../emails/index.ts'
import type { PollEmailProps } from '../emails/index.ts'

const BASE: PollEmailProps = {
  memberFirstName: 'Louis',
  clubName: 'Cercle Arago',
  pollTitle: 'Réallouer vers les ETF obligataires',
  pollDescription: 'Contexte : hausse des taux et volatilité actions Q2.',
  questionType: 'single_choice',
  // Midi UTC : évite tout passage de minuit dépendant du fuseau de la machine de test.
  closesAt: '2026-06-30T12:00:00Z',
  variant: 'opened',
}

describe('PollEmail', () => {
  it('opened : titre, prénom, club, encart anonymat, CTA « Voter maintenant »', async () => {
    const html = await renderPollEmailHtml(BASE)
    expect(html).toMatch(/EVOLVE/i)
    expect(html).toContain('Un vote attend votre avis')
    expect(html).toContain('Louis')
    expect(html).toContain('Cercle Arago')
    expect(html).toContain('Voter maintenant')
    expect(html).toMatch(/reste anonyme/i)
    // Échéance longue FR (le mois exact dépend du fuseau ; on vérifie l'année + la clause).
    expect(html).toContain('Répondez avant le')
    expect(html).toContain('2026')
    // CTA → /votes.
    expect(html).toContain('https://app.evolve.capital/votes')
  })

  it('closed : « Résultats du vote », PAS d’encart anonymat, aucune participation', async () => {
    const html = await renderPollEmailHtml({ ...BASE, variant: 'closed' })
    expect(html).toContain('Résultats du vote')
    expect(html).toContain('Voir les résultats')
    expect(html).not.toMatch(/reste anonyme/i)
    // Anonymat : jamais de phrasé de participation ni de barre de résultats dans le corps.
    expect(html).not.toMatch(/membres?\s+ont\s+vot|\bparticipation\b/i)
  })

  it('reminder : « Dernière chance », label ambre, encart anonymat', async () => {
    const html = await renderPollEmailHtml({ ...BASE, variant: 'reminder' })
    expect(html).toContain('Dernière chance de voter')
    expect(html).toContain('Échéance proche')
    expect(html).toMatch(/reste anonyme/i)
    // Accent ambre (warning), JAMAIS rouge brand.
    expect(html.toLowerCase()).toContain(dataViz.warningStrong.toLowerCase())
    expect(html.toLowerCase()).not.toContain(brand.red.toLowerCase())
  })

  it('CTA jaune brand sur les 3 variantes, jamais brand.red', async () => {
    for (const variant of ['opened', 'closed', 'reminder'] as const) {
      const html = await renderPollEmailHtml({ ...BASE, variant })
      expect(html.toLowerCase()).toContain(brand.yellow.toLowerCase())
      expect(html.toLowerCase()).not.toContain(brand.red.toLowerCase())
    }
  })

  it('anonymat : aucun phrasé « membres ont voté » dans aucune variante', async () => {
    for (const variant of ['opened', 'closed', 'reminder'] as const) {
      const html = await renderPollEmailHtml({ ...BASE, variant })
      expect(html).not.toMatch(/membres?\s+ont\s+vot/i)
    }
  })

  it('rend le titre verbatim, y compris un « % » légitime du sujet de vote', async () => {
    const html = await renderPollEmailHtml({
      ...BASE,
      pollTitle: 'Faut-il réallouer 15 % du portefeuille ?',
    })
    expect(html).toContain('Faut-il réallouer 15 % du portefeuille ?')
  })

  it('omet la clause d’échéance quand closesAt est null', async () => {
    const html = await renderPollEmailHtml({ ...BASE, closesAt: null })
    expect(html).not.toContain('Répondez avant le')
    expect(html).not.toContain('undefined')
  })

  it('respecte appUrl quand fourni (CTA → {appUrl}/votes)', async () => {
    const html = await renderPollEmailHtml({ ...BASE, appUrl: 'https://staging.evolve.capital' })
    expect(html).toContain('https://staging.evolve.capital/votes')
  })

  it('jamais d’undefined à l’écran même avec des champs vides', async () => {
    const html = await renderPollEmailHtml({
      memberFirstName: '',
      clubName: '',
      pollTitle: '',
      questionType: 'yes_no',
      closesAt: null,
      variant: 'opened',
    })
    expect(html).not.toContain('undefined')
  })
})
