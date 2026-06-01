import { render, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ContributionsTimeline, type TimelineYear } from './ContributionsTimeline'

expect.extend(toHaveNoViolations)

const YEARS: TimelineYear[] = [
  {
    year: 2026,
    months: [
      {
        month: 4,
        variant: 'pending',
        tooltip: 'Avril 2026 — en attente',
        ariaLabel: 'Avril 2026 en attente',
      },
      { month: 3, variant: 'paid', tooltip: 'Mars 2026 — payé', ariaLabel: 'Mars 2026 payé' },
    ],
  },
  {
    year: 2025,
    months: [
      {
        month: 12,
        variant: 'paid',
        tooltip: 'Décembre 2025 — payé',
        ariaLabel: 'Décembre 2025 payé',
      },
      {
        month: 11,
        variant: 'late',
        tooltip: 'Novembre 2025 — en retard',
        ariaLabel: 'Novembre 2025 en retard',
      },
      {
        month: 10,
        variant: 'paid',
        tooltip: 'Octobre 2025 — payé',
        ariaLabel: 'Octobre 2025 payé',
      },
    ],
  },
]

describe('ContributionsTimeline — accessibilité (jest-axe)', () => {
  it('pas de violations axe', async () => {
    const { container } = render(<ContributionsTimeline years={YEARS} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('ContributionsTimeline — rendu', () => {
  it('affiche un header par année', () => {
    const { getByRole } = render(<ContributionsTimeline years={YEARS} />)
    expect(getByRole('heading', { name: '2026' })).toBeInTheDocument()
    expect(getByRole('heading', { name: '2025' })).toBeInTheDocument()
  })

  it('rend une cellule par mois (via aria-label)', () => {
    const { getByLabelText } = render(<ContributionsTimeline years={YEARS} />)
    expect(getByLabelText('Mars 2026 payé')).toBeInTheDocument()
    expect(getByLabelText('Novembre 2025 en retard')).toBeInTheDocument()
  })

  it('état vide → EmptyState', () => {
    const { getByText } = render(<ContributionsTimeline years={[]} />)
    expect(getByText("Aucune cotisation pour l'instant")).toBeInTheDocument()
  })

  it('isLoading → grille de skeletons (aria-busy)', () => {
    const { container } = render(<ContributionsTimeline years={[]} isLoading />)
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })
})

describe('ContributionsTimeline — navigation clavier', () => {
  it('ArrowRight déplace le focus à la cellule suivante', () => {
    const { getByLabelText, getByRole } = render(<ContributionsTimeline years={YEARS} />)
    const first = getByLabelText('Avril 2026 en attente')
    first.focus()
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(getByRole('list'), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(getByLabelText('Mars 2026 payé'))
  })
})
