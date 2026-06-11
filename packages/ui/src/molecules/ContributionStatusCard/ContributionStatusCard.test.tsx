import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ContributionStatusCard } from './ContributionStatusCard'

expect.extend(toHaveNoViolations)

describe('ContributionStatusCard — variant compact (V2)', () => {
  it('rend le titre et le badge de statut sur le header', () => {
    render(
      <ContributionStatusCard
        variant="compact"
        status="ok"
        title="Cotisation"
        statusLabel="À jour"
        message="Tu es à jour."
      />
    )
    expect(screen.getByText('Cotisation')).toBeInTheDocument()
    expect(screen.getByText('À jour')).toBeInTheDocument()
    expect(screen.getByText('Tu es à jour.')).toBeInTheDocument()
  })

  it('compact + pending → badge en style warning (bg-data-warning-50 / text-data-warning-strong)', () => {
    render(
      <ContributionStatusCard
        variant="compact"
        status="pending"
        statusLabel="En attente"
        message="En cours de traitement."
      />
    )
    const badge = screen.getByText('En attente')
    expect(badge.className).toContain('bg-data-warning-50')
    expect(badge.className).toContain('text-data-warning-strong')
  })

  it('default + pending → reste neutre (non-régression du mapping par défaut)', () => {
    const { container } = render(
      <ContributionStatusCard status="pending" statusLabel="En attente" />
    )
    expect(container.querySelector('.bg-data-neutral-50')).not.toBeNull()
    expect(container.querySelector('.bg-data-warning-50')).toBeNull()
  })

  it('compact + late → montant dû rendu', () => {
    render(
      <ContributionStatusCard
        variant="compact"
        status="late"
        statusLabel="En retard"
        amountDueLabel="150,00 €"
      />
    )
    expect(screen.getByText('150,00 €')).toBeInTheDocument()
  })

  it('compact sans message → pas de paragraphe vide', () => {
    const { container } = render(
      <ContributionStatusCard variant="compact" status="ok" statusLabel="À jour" />
    )
    // Seuls le titre et le badge sont rendus
    expect(container.querySelectorAll('p')).toHaveLength(1)
  })
})

describe('ContributionStatusCard — accessibilité (jest-axe)', () => {
  it.each(['ok', 'pending', 'late'] as const)(
    'compact %s : pas de violations axe',
    async (status: 'ok' | 'pending' | 'late') => {
      const { container } = render(
        <ContributionStatusCard
          variant="compact"
          status={status}
          statusLabel="Statut"
          message="Message court."
          amountDueLabel={status === 'ok' ? null : '150,00 €'}
        />
      )
      expect(await axe(container)).toHaveNoViolations()
    }
  )

  it('default (non-régression) : pas de violations axe', async () => {
    const { container } = render(
      <ContributionStatusCard status="late" statusLabel="En retard" amountDueLabel="150,00 €" />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
