import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { InvitationStatusBadge } from './InvitationStatusBadge'

expect.extend(toHaveNoViolations)

describe('InvitationStatusBadge — rendu', () => {
  it('rend le libellé FR de chaque statut', () => {
    const { rerender } = render(<InvitationStatusBadge status="pending" />)
    expect(screen.getByText('En attente')).toBeInTheDocument()
    rerender(<InvitationStatusBadge status="accepted" />)
    expect(screen.getByText('Acceptée')).toBeInTheDocument()
    rerender(<InvitationStatusBadge status="expired" />)
    expect(screen.getByText('Expirée')).toBeInTheDocument()
    rerender(<InvitationStatusBadge status="revoked" />)
    expect(screen.getByText('Révoquée')).toBeInTheDocument()
  })

  it('révoquée : token data-negative, jamais le rouge brand', () => {
    const { container } = render(<InvitationStatusBadge status="revoked" />)
    expect(container.innerHTML).toContain('data-negative')
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
    expect(container.innerHTML).not.toContain('brand-red')
  })

  it('libellés i18n surchargeables', () => {
    render(<InvitationStatusBadge status="pending" labels={{ pending: 'Pending' }} />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })
})

describe('InvitationStatusBadge — accessibilité (jest-axe)', () => {
  it('pas de violations axe (les 4 statuts)', async () => {
    const { container } = render(
      <div>
        <InvitationStatusBadge status="pending" />
        <InvitationStatusBadge status="accepted" />
        <InvitationStatusBadge status="expired" />
        <InvitationStatusBadge status="revoked" />
      </div>
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
