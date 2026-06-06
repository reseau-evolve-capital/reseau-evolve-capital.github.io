import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { InvitationsTable, type InvitationRow } from './InvitationsTable'

expect.extend(toHaveNoViolations)

const INVITATIONS: InvitationRow[] = [
  { id: '1', email: 'a@x.fr', sentAt: '3 juin 2026', expiresAt: '6 juin 2026', status: 'pending' },
  { id: '2', email: 'b@x.fr', sentAt: '28 mai 2026', expiresAt: '31 mai 2026', status: 'accepted' },
  { id: '3', email: 'c@x.fr', sentAt: '20 mai 2026', expiresAt: '23 mai 2026', status: 'expired' },
  { id: '4', email: 'd@x.fr', sentAt: '12 mai 2026', expiresAt: '15 mai 2026', status: 'revoked' },
]

describe('InvitationsTable — rendu', () => {
  it('rend 1 ligne par invitation', () => {
    render(<InvitationsTable invitations={INVITATIONS} onResend={() => {}} onRevoke={() => {}} />)
    expect(screen.getAllByTestId('invitation-row')).toHaveLength(4)
  })

  it('état vide → EmptyState « Aucune invitation. »', () => {
    render(<InvitationsTable invitations={[]} onResend={() => {}} onRevoke={() => {}} />)
    expect(screen.getByText('Aucune invitation.')).toBeInTheDocument()
    expect(
      screen.getByText('Invitez votre premier membre pour démarrer la bêta.')
    ).toBeInTheDocument()
  })
})

describe('InvitationsTable — règles d’activation des actions', () => {
  it('pending : Renvoyer + Révoquer activés', async () => {
    const u = userEvent.setup()
    const onResend = vi.fn()
    const onRevoke = vi.fn()
    render(
      <InvitationsTable invitations={[INVITATIONS[0]!]} onResend={onResend} onRevoke={onRevoke} />
    )
    await u.click(screen.getByRole('button', { name: /Renvoyer l'invitation à a@x\.fr/i }))
    await u.click(screen.getByRole('button', { name: /Révoquer l'invitation de a@x\.fr/i }))
    expect(onResend).toHaveBeenCalledWith('1')
    expect(onRevoke).toHaveBeenCalledWith('1')
  })

  it('accepted : Renvoyer + Révoquer désactivés', () => {
    render(
      <InvitationsTable invitations={[INVITATIONS[1]!]} onResend={() => {}} onRevoke={() => {}} />
    )
    expect(screen.getByRole('button', { name: /Renvoyer/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Révoquer/i })).toBeDisabled()
  })

  it('expired : Renvoyer activé, Révoquer désactivé, email barré', () => {
    render(
      <InvitationsTable invitations={[INVITATIONS[2]!]} onResend={() => {}} onRevoke={() => {}} />
    )
    expect(screen.getByRole('button', { name: /Renvoyer/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Révoquer/i })).toBeDisabled()
    expect(screen.getByText('c@x.fr')).toHaveClass('line-through')
  })

  it('revoked : les deux désactivés, email barré', () => {
    render(
      <InvitationsTable invitations={[INVITATIONS[3]!]} onResend={() => {}} onRevoke={() => {}} />
    )
    expect(screen.getByRole('button', { name: /Renvoyer/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Révoquer/i })).toBeDisabled()
    expect(screen.getByText('d@x.fr')).toHaveClass('line-through')
  })
})

describe('InvitationsTable — accessibilité (jest-axe)', () => {
  it('pas de violations axe', async () => {
    const { container } = render(
      <InvitationsTable invitations={INVITATIONS} onResend={() => {}} onRevoke={() => {}} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
