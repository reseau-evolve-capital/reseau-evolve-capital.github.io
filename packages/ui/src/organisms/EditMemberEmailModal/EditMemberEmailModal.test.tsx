import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { EditMemberEmailModal } from './EditMemberEmailModal'

expect.extend(toHaveNoViolations)

// Radix Dialog s'appuie sur des API pointer absentes de jsdom.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => undefined
  if (!Element.prototype.releasePointerCapture)
    Element.prototype.releasePointerCapture = () => undefined
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => undefined
})

describe('EditMemberEmailModal', () => {
  it('ouverte : titre avec le nom + champ email + CTA enregistrer', () => {
    render(
      <EditMemberEmailModal
        open
        memberName="Inès BAMBA"
        onConfirm={() => {}}
        onOpenChange={() => {}}
      />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText("Renseigner l'email de Inès BAMBA")).toBeInTheDocument()
    expect(screen.getByLabelText('Adresse email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })

  it('CTA désactivé tant que le champ est vide', () => {
    render(
      <EditMemberEmailModal open memberName="X" onConfirm={() => {}} onOpenChange={() => {}} />
    )
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })

  it('remonte l’email saisi (trimé) à la confirmation', async () => {
    const u = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <EditMemberEmailModal open memberName="X" onConfirm={onConfirm} onOpenChange={() => {}} />
    )
    await u.type(screen.getByLabelText('Adresse email'), '  alice@x.fr  ')
    await u.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(onConfirm).toHaveBeenCalledWith('alice@x.fr')
  })

  it('préremplit avec initialEmail quand fourni', () => {
    render(
      <EditMemberEmailModal
        open
        memberName="X"
        initialEmail="bob@x.fr"
        onConfirm={() => {}}
        onOpenChange={() => {}}
      />
    )
    expect(screen.getByLabelText('Adresse email')).toHaveValue('bob@x.fr')
  })

  it('affiche un message d’erreur inline (email déjà utilisé)', () => {
    render(
      <EditMemberEmailModal
        open
        memberName="X"
        error="Cet email est déjà utilisé."
        onConfirm={() => {}}
        onOpenChange={() => {}}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Cet email est déjà utilisé.')
  })

  it('Escape déclenche onOpenChange(false)', async () => {
    const u = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <EditMemberEmailModal open memberName="X" onConfirm={() => {}} onOpenChange={onOpenChange} />
    )
    await u.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('libellés i18n via props (EN)', () => {
    render(
      <EditMemberEmailModal
        open
        memberName="X"
        onConfirm={() => {}}
        onOpenChange={() => {}}
        labels={{
          title: (n) => `Set email for ${n}`,
          emailLabel: 'Email address',
          confirm: 'Save',
        }}
      />
    )
    expect(screen.getByText('Set email for X')).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('jamais de rouge brand (pas de hex E93E3A)', () => {
    const { baseElement } = render(
      <EditMemberEmailModal open memberName="X" onConfirm={() => {}} onOpenChange={() => {}} />
    )
    expect(baseElement.innerHTML).not.toMatch(/E93E3A/i)
    expect(baseElement.innerHTML).not.toContain('brand-red')
  })
})

describe('EditMemberEmailModal — accessibilité (jest-axe)', () => {
  it('pas de violations axe', async () => {
    const { baseElement } = render(
      <EditMemberEmailModal
        open
        memberName="Inès BAMBA"
        onConfirm={() => {}}
        onOpenChange={() => {}}
      />
    )
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('pas de violations axe avec erreur inline', async () => {
    const { baseElement } = render(
      <EditMemberEmailModal
        open
        memberName="Inès BAMBA"
        error="Cet email est déjà utilisé."
        onConfirm={() => {}}
        onOpenChange={() => {}}
      />
    )
    expect(await axe(baseElement)).toHaveNoViolations()
  })
})
