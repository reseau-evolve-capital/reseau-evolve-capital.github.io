import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ChangeRoleModal } from './ChangeRoleModal'

expect.extend(toHaveNoViolations)

// Radix Select/Dialog s'appuient sur des API pointer absentes de jsdom.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => undefined
  if (!Element.prototype.releasePointerCapture)
    Element.prototype.releasePointerCapture = () => undefined
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => undefined
})

describe('ChangeRoleModal', () => {
  it('ouverte : titre avec le nom + encart data-warning + CTA Enregistrer', () => {
    render(
      <ChangeRoleModal
        open
        memberName="Inès BAMBA"
        currentRole="member"
        canPromotePresident
        onConfirm={() => {}}
        onOpenChange={() => {}}
      />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Modifier le rôle de Inès BAMBA')).toBeInTheDocument()
    // Encart d'avertissement (role_source='manual') toujours présent.
    expect(screen.getByText(/ne sera plus écrasé par la synchronisation/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })

  it('anti-escalade : un trésorier (canPromotePresident=false) ne voit PAS « Président »', async () => {
    const u = userEvent.setup()
    render(
      <ChangeRoleModal
        open
        memberName="Inès BAMBA"
        currentRole="member"
        canPromotePresident={false}
        onConfirm={() => {}}
        onOpenChange={() => {}}
      />
    )
    await u.click(screen.getByRole('combobox', { name: 'Rôle' }))
    expect(await screen.findByRole('option', { name: 'Membre' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Trésorier' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Président' })).not.toBeInTheDocument()
  })

  it('un président habilité voit bien l’option « Président »', async () => {
    const u = userEvent.setup()
    render(
      <ChangeRoleModal
        open
        memberName="Inès BAMBA"
        currentRole="member"
        canPromotePresident
        onConfirm={() => {}}
        onOpenChange={() => {}}
      />
    )
    await u.click(screen.getByRole('combobox', { name: 'Rôle' }))
    expect(await screen.findByRole('option', { name: 'Président' })).toBeInTheDocument()
  })

  it('sélectionner un nouveau rôle puis Enregistrer → onConfirm reçoit le rôle choisi', async () => {
    const u = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <ChangeRoleModal
        open
        memberName="Inès BAMBA"
        currentRole="member"
        canPromotePresident
        onConfirm={onConfirm}
        onOpenChange={() => {}}
      />
    )
    await u.click(screen.getByRole('combobox', { name: 'Rôle' }))
    await u.click(await screen.findByRole('option', { name: 'Trésorier' }))
    await u.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(onConfirm).toHaveBeenCalledWith('treasurer')
  })

  it('Enregistrer sans changement → ferme sans appeler onConfirm', async () => {
    const u = userEvent.setup()
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <ChangeRoleModal
        open
        memberName="Inès BAMBA"
        currentRole="treasurer"
        canPromotePresident
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />
    )
    await u.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('affiche l’erreur inline fournie', () => {
    render(
      <ChangeRoleModal
        open
        memberName="Inès BAMBA"
        currentRole="member"
        canPromotePresident
        error="Vous n'avez pas les droits pour attribuer ce rôle."
        onConfirm={() => {}}
        onOpenChange={() => {}}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/n'avez pas les droits/i)
  })

  it('aucune violation a11y (axe)', async () => {
    const { container } = render(
      <ChangeRoleModal
        open
        memberName="Inès BAMBA"
        currentRole="member"
        canPromotePresident
        onConfirm={() => {}}
        onOpenChange={() => {}}
      />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
