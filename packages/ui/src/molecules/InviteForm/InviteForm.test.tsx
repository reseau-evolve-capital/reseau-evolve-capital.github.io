import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { InviteForm } from './InviteForm'

expect.extend(toHaveNoViolations)

describe('InviteForm — comportement', () => {
  it('soumet un email valide via onSubmit (trimé)', async () => {
    const onSubmit = vi.fn()
    render(<InviteForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText(/inviter/i), '  membre@exemple.fr  ')
    await userEvent.click(screen.getByRole('button', { name: /Envoyer/i }))
    expect(onSubmit).toHaveBeenCalledWith('membre@exemple.fr')
  })

  it('email invalide : bloque la soumission + affiche une erreur', async () => {
    const onSubmit = vi.fn()
    render(<InviteForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText(/inviter/i), 'invalide')
    await userEvent.click(screen.getByRole('button', { name: /Envoyer/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/valide/i)
  })

  it('isPending : désactive le bouton (et le champ)', () => {
    render(<InviteForm onSubmit={() => {}} isPending />)
    // En chargement, le Button affiche un spinner (le libellé n'est plus le nom accessible).
    const submit = screen.getByRole('button')
    expect(submit).toBeDisabled()
    expect(submit).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByLabelText(/inviter/i)).toBeDisabled()
  })

  it('affiche le message d’erreur serveur fourni', () => {
    render(<InviteForm onSubmit={() => {}} error="Déjà invité." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Déjà invité.')
  })

  it('note affichée par défaut (sans erreur)', () => {
    render(<InviteForm onSubmit={() => {}} />)
    expect(screen.getByText(/72 h/)).toBeInTheDocument()
  })
})

describe('InviteForm — accessibilité (jest-axe)', () => {
  it('pas de violations axe (état par défaut)', async () => {
    const { container } = render(<InviteForm onSubmit={() => {}} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('pas de violations axe (état erreur)', async () => {
    const { container } = render(<InviteForm onSubmit={() => {}} error="Déjà invité." />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
