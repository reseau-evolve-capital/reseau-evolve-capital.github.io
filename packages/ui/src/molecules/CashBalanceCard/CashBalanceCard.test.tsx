import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { CashBalanceCard } from './CashBalanceCard'

expect.extend(toHaveNoViolations)

describe('CashBalanceCard', () => {
  it('état ok : montant formaté (0 décimale) + caption + aria-live', () => {
    const { container } = render(<CashBalanceCard balance={86260} />)
    const amount = container.querySelector('[aria-live="polite"]') as HTMLElement
    expect(amount).toBeTruthy()
    expect(amount.textContent).toContain('86')
    expect(amount.textContent).toContain('260')
    expect(amount.textContent).not.toContain(',')
    expect(screen.getByText('Solde espèces')).toBeInTheDocument()
  })

  it('solde négatif reste NEUTRE (text-text), jamais rouge', () => {
    const { container } = render(<CashBalanceCard balance={-4200} />)
    const amount = container.querySelector('[aria-live="polite"]') as HTMLElement
    expect(amount.className).toContain('text-text')
    expect(amount.className).not.toContain('data-negative')
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
  })

  it('balance null → fallback "—" (jamais NaN/undefined)', () => {
    const { container } = render(<CashBalanceCard balance={null} state="empty" />)
    const amount = container.querySelector('[aria-live="polite"]') as HTMLElement
    expect(amount.textContent).toBe('—')
    expect(container.textContent).not.toContain('NaN')
    expect(container.textContent).not.toContain('undefined')
  })

  it('badge courtier cliquable : role+tabIndex, déclenche onOpen au clic et au clavier', async () => {
    const onOpen = vi.fn()
    const { container } = render(
      <CashBalanceCard
        balance={86260}
        brokerReconciliation={{ consistent: true, brokerName: 'Bourse Direct', onOpen }}
      />
    )
    const btn = container.querySelector('[role="button"]') as HTMLElement
    expect(btn).toBeTruthy()
    expect(btn.getAttribute('tabindex')).toBe('0')
    await userEvent.click(btn)
    expect(onOpen).toHaveBeenCalledTimes(1)
    btn.focus()
    await userEvent.keyboard('{Enter}')
    expect(onOpen).toHaveBeenCalledTimes(2)
  })

  it('badge courtier non cliquable (sans onOpen) : pas de role button', () => {
    const { container } = render(
      <CashBalanceCard
        balance={86260}
        brokerReconciliation={{ consistent: true, brokerName: 'Bourse Direct' }}
      />
    )
    expect(container.querySelector('[role="button"]')).toBeNull()
  })

  it('état error : role alert + bouton réessayer fonctionnel', async () => {
    const onRetry = vi.fn()
    render(<CashBalanceCard balance={null} state="error" onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Réessayer'))
    expect(onRetry).toHaveBeenCalled()
  })

  it('état loading : aria-busy', () => {
    const { container } = render(<CashBalanceCard balance={null} state="loading" />)
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
  })

  it('aucune violation a11y (état ok avec badge)', async () => {
    const { container } = render(
      <CashBalanceCard
        balance={86260}
        computedAtLabel="Calculé il y a 3 min"
        brokerReconciliation={{ consistent: true, brokerName: 'Bourse Direct', onOpen: vi.fn() }}
      />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('aucune violation a11y (état error)', async () => {
    const { container } = render(<CashBalanceCard balance={null} state="error" onRetry={vi.fn()} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
