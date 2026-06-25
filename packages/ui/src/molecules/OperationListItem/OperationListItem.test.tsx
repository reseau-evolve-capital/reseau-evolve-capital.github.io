import { render, screen, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { OperationListItem, type OperationListItemData } from './OperationListItem'

expect.extend(toHaveNoViolations)

const base: OperationListItemData = {
  id: 'OP-318',
  type: 'contribution',
  label: 'Éric Lambert',
  meta: 'Cotisation de juin',
  date: '2026-06-18',
  amount: 300,
  status: 'ok',
}

describe('OperationListItem', () => {
  it('affiche label, badge type, meta', () => {
    render(<OperationListItem operation={base} />)
    expect(screen.getByText('Éric Lambert')).toBeInTheDocument()
    expect(screen.getByText('Cotisation')).toBeInTheDocument()
    expect(screen.getByText(/Cotisation de juin/)).toBeInTheDocument()
  })

  it('est cliquable au clic et au clavier (Enter/Espace)', () => {
    const onSelect = vi.fn()
    render(<OperationListItem operation={base} onSelect={onSelect} />)
    const row = screen.getByRole('button')
    fireEvent.click(row)
    expect(onSelect).toHaveBeenCalledWith('OP-318')
    fireEvent.keyDown(row, { key: 'Enter' })
    fireEvent.keyDown(row, { key: ' ' })
    expect(onSelect).toHaveBeenCalledTimes(3)
  })

  it('a un tabIndex 0 (focusable)', () => {
    render(<OperationListItem operation={base} />)
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0')
  })

  it('statut settled → tag Settlée', () => {
    render(<OperationListItem operation={{ ...base, status: 'settled' }} />)
    expect(screen.getByText('Settlée')).toBeInTheDocument()
  })

  it('annulée : opacity, line-through label, chip grayscale', () => {
    const { container } = render(<OperationListItem operation={{ ...base, status: 'cancelled' }} />)
    expect(container.querySelector('[role="button"]')?.className).toContain('opacity-60')
    expect(screen.getByText('Éric Lambert').className).toContain('line-through')
    expect(container.innerHTML).toContain('grayscale')
    expect(screen.getByText('Annulée')).toBeInTheDocument()
  })

  it('prop cancelled force l’état annulé même si status ok', () => {
    const { container } = render(<OperationListItem operation={base} cancelled />)
    expect(container.querySelector('[role="button"]')?.className).toContain('opacity-60')
  })

  it('date absente → fallback —, jamais NaN/undefined', () => {
    render(<OperationListItem operation={{ ...base, date: null, meta: null }} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('montant négatif via CashDeltaBadge, jamais brand-red', () => {
    const { container } = render(<OperationListItem operation={{ ...base, amount: -18 }} />)
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
    expect(container.innerHTML).toContain('text-data-negative')
  })

  it('aucune violation a11y', async () => {
    const { container } = render(<OperationListItem operation={base} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
