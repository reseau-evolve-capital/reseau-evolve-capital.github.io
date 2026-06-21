import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ComingSoonCard } from './ComingSoonCard'

expect.extend(toHaveNoViolations)

describe('ComingSoonCard — rendu', () => {
  it('affiche le titre dans un <h2>', () => {
    const { getByRole } = render(
      <ComingSoonCard title="Synthèse IA" description="Bientôt disponible." />
    )
    expect(getByRole('heading', { level: 2, name: 'Synthèse IA' })).toBeTruthy()
  })

  it('affiche la description (jamais de faux contenu)', () => {
    const { getByText } = render(
      <ComingSoonCard title="Synthèse IA" description="Le digest IA arrive bientôt." />
    )
    expect(getByText('Le digest IA arrive bientôt.')).toBeTruthy()
  })

  it('affiche le badge « Bientôt » par défaut', () => {
    const { getByText } = render(<ComingSoonCard title="T" description="D" />)
    expect(getByText('Bientôt')).toBeTruthy()
  })

  it('permet de surcharger le libellé du badge (i18n)', () => {
    const { getByText, queryByText } = render(
      <ComingSoonCard title="T" description="D" badgeLabel="Soon" />
    )
    expect(getByText('Soon')).toBeTruthy()
    expect(queryByText('Bientôt')).toBeNull()
  })

  it('expose un role="region" nommé par le titre', () => {
    const { getByRole } = render(<ComingSoonCard title="Synthèse IA" description="D" />)
    expect(getByRole('region', { name: 'Synthèse IA' })).toBeTruthy()
  })

  it('affiche le skeleton décoratif quand withSkeleton est vrai', () => {
    const { container } = render(<ComingSoonCard title="T" description="D" withSkeleton />)
    // Le bloc skeleton est aria-hidden (décoratif).
    expect(container.querySelector('[aria-hidden="true"].opacity-50, .opacity-50')).toBeTruthy()
  })
})

describe('ComingSoonCard — accessibilité (jest-axe)', () => {
  it('pas de violations axe', async () => {
    const { container } = render(
      <ComingSoonCard title="Synthèse IA" description="Le digest IA arrive bientôt." withSkeleton />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('ComingSoonCard — règle hex', () => {
  it('innerHTML ne contient aucun code couleur hex brut', () => {
    const { container } = render(
      <ComingSoonCard title="Synthèse IA" description="D" withSkeleton />
    )
    expect(container.innerHTML).not.toMatch(/#[0-9A-Fa-f]{6}/)
  })
})
