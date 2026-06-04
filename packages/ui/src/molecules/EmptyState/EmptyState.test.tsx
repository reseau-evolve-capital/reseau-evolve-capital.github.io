import { render, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { EmptyState } from './EmptyState'

expect.extend(toHaveNoViolations)

describe('EmptyState — rendu', () => {
  it('affiche le titre dans un <h2>', () => {
    const { getByRole } = render(<EmptyState title="Données non disponibles" />)
    const heading = getByRole('heading', { level: 2, name: 'Données non disponibles' })
    expect(heading).toBeTruthy()
  })

  it('affiche la description quand elle est fournie', () => {
    const { getByText } = render(<EmptyState title="Titre" description="Une description utile." />)
    expect(getByText('Une description utile.')).toBeTruthy()
  })

  it("n'affiche pas de paragraphe de description quand elle est absente", () => {
    const { queryByText } = render(<EmptyState title="Titre seul" />)
    // Aucun texte autre que le titre
    expect(queryByText(/description/i)).toBeNull()
  })

  it("affiche l'icône quand icon est fourni", () => {
    const { container } = render(<EmptyState title="Titre" icon="Calendar" />)
    // L'icône est rendue dans un <svg> (lucide-react)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it("n'affiche pas d'icône quand icon est absent", () => {
    const { container } = render(<EmptyState title="Titre sans icône" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeNull()
  })

  it("affiche un bouton avec le label de l'action quand action est fourni", () => {
    const handler = vi.fn()
    const { getByRole } = render(
      <EmptyState title="Titre" action={{ label: 'En savoir plus', onClick: handler }} />
    )
    expect(getByRole('button', { name: 'En savoir plus' })).toBeTruthy()
  })

  it("n'affiche pas de bouton quand action est absent", () => {
    const { queryByRole } = render(<EmptyState title="Titre sans action" />)
    expect(queryByRole('button')).toBeNull()
  })
})

describe('EmptyState — landmark accessible', () => {
  it('expose un role="region" nommé par le title par défaut', () => {
    const { getByRole } = render(<EmptyState title="Aucune cotisation" />)
    expect(getByRole('region', { name: 'Aucune cotisation' })).toBeTruthy()
  })

  it('utilise aria-label comme nom du landmark quand il est fourni', () => {
    const { getByRole } = render(
      <EmptyState title="Aucune cotisation" aria-label="Historique des cotisations vide" />
    )
    expect(getByRole('region', { name: 'Historique des cotisations vide' })).toBeTruthy()
  })
})

describe('EmptyState — interaction', () => {
  it("cliquer sur le bouton d'action appelle action.onClick", () => {
    const handler = vi.fn()
    const { getByRole } = render(
      <EmptyState title="Erreur de chargement" action={{ label: 'Réessayer', onClick: handler }} />
    )
    fireEvent.click(getByRole('button', { name: 'Réessayer' }))
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe('EmptyState — accessibilité (jest-axe)', () => {
  it('pas de violations axe (titre seul)', async () => {
    const { container } = render(<EmptyState title="Données non disponibles" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('pas de violations axe (avec icône + description + action)', async () => {
    const { container } = render(
      <EmptyState
        icon="Calendar"
        title="Données non disponibles"
        description="Tes données ne sont pas encore disponibles."
        action={{ label: 'En savoir plus', onClick: () => undefined }}
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('EmptyState — règle hex', () => {
  it('innerHTML ne contient aucun code couleur hex brut', () => {
    const { container } = render(
      <EmptyState
        icon="Calendar"
        title="Données non disponibles"
        description="Description."
        action={{ label: 'Action', onClick: () => undefined }}
      />
    )
    expect(container.innerHTML).not.toMatch(/#[0-9A-Fa-f]{6}/)
  })
})
