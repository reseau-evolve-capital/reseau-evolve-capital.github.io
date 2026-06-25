import { render, screen, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { OperationDetailDrawer, type OperationDetail } from './OperationDetailDrawer'

expect.extend(toHaveNoViolations)

// Radix Dialog s'appuie sur des API pointer absentes de jsdom.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => undefined
  if (!Element.prototype.releasePointerCapture)
    Element.prototype.releasePointerCapture = () => undefined
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => undefined
})

const OK: OperationDetail = {
  id: 'OP-310',
  type: 'buy',
  label: 'NASDAQ:NVDA',
  meta: '160 titres @ 155 €',
  date: '10 juin 2026',
  amount: -24800,
  ref: 'BD-NVDA-0610',
  source: 'manual',
  status: 'ok',
}
const SETTLED: OperationDetail = {
  ...OK,
  id: 'OP-298',
  label: 'Sofia Rossi',
  amount: 300,
  status: 'settled',
}
const CANCELLED: OperationDetail = {
  ...OK,
  id: 'OP-241',
  label: 'Éric Lambert',
  amount: 300,
  status: 'cancelled',
  cancelReason: 'Doublon de saisie lors de la migration.',
}

function renderDrawer(op: OperationDetail | null, extra = {}) {
  return render(<OperationDetailDrawer open operation={op} onOpenChange={() => {}} {...extra} />)
}

describe('OperationDetailDrawer', () => {
  it('operation null → ne rend rien', () => {
    const { container } = renderDrawer(null)
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('role=dialog avec titre (label)', () => {
    renderDrawer(OK)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('NASDAQ:NVDA')).toBeInTheDocument()
    // sous-texte mono « {type} · {id} »
    expect(screen.getByText(/· OP-310/)).toBeInTheDocument()
  })

  it('montant négatif affiché en data-negative, jamais brand-red', () => {
    const { baseElement } = renderDrawer(OK)
    expect(screen.getByText('−24 800 €')).toBeInTheDocument()
    expect(baseElement.innerHTML).not.toMatch(/E93E3A/i)
  })

  it("status ok → bouton danger « Annuler l'opération » actif déclenche onCancelRequest", () => {
    const onCancelRequest = vi.fn()
    renderDrawer(OK, { onCancelRequest })
    const btn = screen.getByRole('button', { name: "Annuler l'opération" })
    expect(btn).toBeEnabled()
    fireEvent.click(btn)
    expect(onCancelRequest).toHaveBeenCalled()
  })

  it('status settled → bouton désactivé + avertissement correction, ne déclenche rien', () => {
    const onCancelRequest = vi.fn()
    renderDrawer(SETTLED, { onCancelRequest })
    const btn = screen.getByRole('button', { name: "Annuler l'opération" })
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(onCancelRequest).not.toHaveBeenCalled()
    expect(screen.getByText(/passe par une correction/)).toBeInTheDocument()
  })

  it('status cancelled → footer historique + encart motif + montant barré', () => {
    renderDrawer(CANCELLED)
    expect(screen.getByText(/conservée pour l’historique/)).toBeInTheDocument()
    expect(screen.getByText(/Doublon de saisie/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: "Annuler l'opération" })).not.toBeInTheDocument()
  })

  it('référence absente → fallback —, jamais undefined', () => {
    renderDrawer({ ...OK, ref: null })
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('libellés surchargeables (i18n)', () => {
    renderDrawer(OK, { labels: { cancelButton: 'Cancel operation' } })
    expect(screen.getByRole('button', { name: 'Cancel operation' })).toBeInTheDocument()
  })

  it('aucune violation a11y (ok)', async () => {
    const { baseElement } = renderDrawer(OK, { onCancelRequest: () => {} })
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('aucune violation a11y (cancelled)', async () => {
    const { baseElement } = renderDrawer(CANCELLED)
    expect(await axe(baseElement)).toHaveNoViolations()
  })
})
