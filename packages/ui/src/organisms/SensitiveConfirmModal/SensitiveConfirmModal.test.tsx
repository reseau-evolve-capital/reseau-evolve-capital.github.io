import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { SensitiveConfirmModal } from './SensitiveConfirmModal'

expect.extend(toHaveNoViolations)

// Radix Dialog/Checkbox s'appuient sur des API pointer absentes de jsdom.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => undefined
  if (!Element.prototype.releasePointerCapture)
    Element.prototype.releasePointerCapture = () => undefined
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => undefined
})

const baseProps = {
  open: true,
  onOpenChange: () => {},
  title: 'Opération sensible',
  description: "Vous modifiez l'identifiant du club chez le courtier.",
  acknowledgeLabel: 'Je confirme vouloir modifier ce champ critique.',
  onConfirm: () => {},
}

describe('SensitiveConfirmModal', () => {
  it('affiche titre, description et le bouton de confirmation', () => {
    render(<SensitiveConfirmModal {...baseProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Opération sensible')).toBeInTheDocument()
    expect(screen.getByText(/identifiant du club chez le courtier/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmer' })).toBeInTheDocument()
  })

  it('le bouton confirmer est DÉSACTIVÉ tant que la case n’est pas cochée', () => {
    render(<SensitiveConfirmModal {...baseProps} />)
    expect(screen.getByRole('button', { name: 'Confirmer' })).toBeDisabled()
  })

  it('cocher la case active le bouton et un clic appelle onConfirm (double-confirm)', async () => {
    const u = userEvent.setup()
    const onConfirm = vi.fn()
    render(<SensitiveConfirmModal {...baseProps} onConfirm={onConfirm} />)

    // 1er geste implicite = modale ouverte ; 2ᵉ geste = cocher.
    await u.click(screen.getByRole('checkbox'))
    const confirm = screen.getByRole('button', { name: 'Confirmer' })
    expect(confirm).toBeEnabled()
    await u.click(confirm)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('ne déclenche pas onConfirm si on clique sans cocher', async () => {
    const u = userEvent.setup()
    const onConfirm = vi.fn()
    render(<SensitiveConfirmModal {...baseProps} onConfirm={onConfirm} />)
    await u.click(screen.getByRole('button', { name: 'Confirmer' }))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('affiche le résumé des changements (avant → après)', () => {
    render(
      <SensitiveConfirmModal
        {...baseProps}
        changes={[{ label: 'Réf. courtier', before: 'BRK-1', after: 'BRK-2' }]}
      />
    )
    expect(screen.getByText('Réf. courtier')).toBeInTheDocument()
    expect(screen.getByText('BRK-1')).toBeInTheDocument()
    expect(screen.getByText('BRK-2')).toBeInTheDocument()
  })

  it('Escape déclenche onOpenChange(false)', async () => {
    const u = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<SensitiveConfirmModal {...baseProps} onOpenChange={onOpenChange} />)
    await u.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('isPending : la confirmation n’appelle pas onConfirm même case cochée', async () => {
    const u = userEvent.setup()
    const onConfirm = vi.fn()
    render(<SensitiveConfirmModal {...baseProps} isPending onConfirm={onConfirm} />)
    await u.click(screen.getByRole('checkbox'))
    // En chargement, le bouton de confirmation affiche un spinner (aria-busy) et est désactivé.
    const busyBtn = document.querySelector('button[aria-busy="true"]')
    expect(busyBtn).not.toBeNull()
    expect(busyBtn).toBeDisabled()
    if (busyBtn) await u.click(busyBtn)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('jamais de rouge brand (#E93E3A)', () => {
    const { baseElement } = render(<SensitiveConfirmModal {...baseProps} />)
    expect(baseElement.innerHTML).not.toMatch(/E93E3A/i)
    expect(baseElement.innerHTML).not.toContain('brand-red')
  })

  it('accessibilité : pas de violations axe', async () => {
    const { baseElement } = render(
      <SensitiveConfirmModal
        {...baseProps}
        changes={[{ label: 'Réf. courtier', before: 'BRK-1', after: 'BRK-2' }]}
      />
    )
    expect(await axe(baseElement)).toHaveNoViolations()
  })
})
