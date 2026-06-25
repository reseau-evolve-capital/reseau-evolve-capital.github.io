import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { OperationCancelModal } from './OperationCancelModal'

expect.extend(toHaveNoViolations)

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
  operationLabel: 'NASDAQ:NVDA',
  amount: -24800,
  onConfirm: () => {},
}

describe('OperationCancelModal', () => {
  it('affiche titre, résumé (label + montant) et champ motif', () => {
    render(<OperationCancelModal {...baseProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Annuler cette opération ?')).toBeInTheDocument()
    expect(screen.getByText(/NASDAQ:NVDA/)).toBeInTheDocument()
    expect(screen.getByText(/−24 800 €/)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: "Motif de l'annulation" })).toBeInTheDocument()
  })

  it('le bouton Confirmer est désactivé tant que le motif est vide', () => {
    render(<OperationCancelModal {...baseProps} />)
    expect(screen.getByRole('button', { name: "Confirmer l'annulation" })).toBeDisabled()
  })

  it('motif blanc (espaces) ne suffit pas', () => {
    render(<OperationCancelModal {...baseProps} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: "Confirmer l'annulation" })).toBeDisabled()
  })

  it('motif renseigné active la confirmation et onConfirm reçoit le motif trimé', async () => {
    const u = userEvent.setup()
    const onConfirm = vi.fn()
    render(<OperationCancelModal {...baseProps} onConfirm={onConfirm} />)
    await u.type(screen.getByRole('textbox'), '  Doublon de saisie  ')
    const confirm = screen.getByRole('button', { name: "Confirmer l'annulation" })
    expect(confirm).toBeEnabled()
    await u.click(confirm)
    expect(onConfirm).toHaveBeenCalledWith('Doublon de saisie')
  })

  it('isPending désactive la confirmation même avec un motif', () => {
    render(<OperationCancelModal {...baseProps} isPending />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Erreur' } })
    expect(screen.getByRole('button', { name: "Confirmer l'annulation" })).toBeDisabled()
  })

  it('le champ motif est obligatoire (aria-required)', () => {
    render(<OperationCancelModal {...baseProps} />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true')
  })

  it('libellés surchargeables (i18n)', () => {
    render(<OperationCancelModal {...baseProps} labels={{ confirmButton: 'Confirm' }} />)
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })

  it('aucune violation a11y', async () => {
    const { baseElement } = render(<OperationCancelModal {...baseProps} />)
    expect(await axe(baseElement)).toHaveNoViolations()
  })
})
