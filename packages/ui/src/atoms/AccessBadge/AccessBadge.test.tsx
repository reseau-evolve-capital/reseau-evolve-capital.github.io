import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { AccessBadge } from './AccessBadge'

expect.extend(toHaveNoViolations)

describe('AccessBadge — rendu', () => {
  it('actif : libellé FR + role status', () => {
    render(<AccessBadge status="active" />)
    const badge = screen.getByRole('status', { name: 'Actif' })
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('Actif')
  })

  it('bloqué : utilise le token data-negative, jamais le rouge brand', () => {
    const { container } = render(<AccessBadge status="locked" />)
    expect(screen.getByRole('status', { name: 'Bloqué' })).toBeInTheDocument()
    expect(container.innerHTML).toContain('data-negative')
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
    expect(container.innerHTML).not.toContain('brand-red')
  })

  it('invité : libellé FR', () => {
    render(<AccessBadge status="invited" />)
    expect(screen.getByRole('status', { name: 'Invité' })).toBeInTheDocument()
  })

  it('libellés i18n surchargeables', () => {
    render(<AccessBadge status="active" labels={{ active: 'Active' }} />)
    expect(screen.getByRole('status', { name: 'Active' })).toBeInTheDocument()
  })
})

describe('AccessBadge — accessibilité (jest-axe)', () => {
  it('pas de violations axe (les 3 statuts)', async () => {
    const { container } = render(
      <div>
        <AccessBadge status="active" />
        <AccessBadge status="locked" />
        <AccessBadge status="invited" />
      </div>
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
