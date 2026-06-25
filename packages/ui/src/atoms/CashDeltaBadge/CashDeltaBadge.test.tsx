import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { CashDeltaBadge } from './CashDeltaBadge'

expect.extend(toHaveNoViolations)

describe('CashDeltaBadge', () => {
  it('positif → "+" et fond data-positive', () => {
    const { container } = render(<CashDeltaBadge value={300} />)
    expect(container.textContent).toMatch(/\+/)
    expect(container.textContent).toContain('300')
    expect(container.innerHTML).toContain('bg-data-positive-50')
    expect(container.innerHTML).toContain('text-data-positive')
  })

  it('négatif → MINUS U+2212 (jamais U+002D) et data-negative', () => {
    const { container } = render(<CashDeltaBadge value={-24800} />)
    expect(container.textContent).toContain('−')
    expect(container.textContent).not.toContain('-24')
    expect(container.innerHTML).toContain('bg-data-negative-50')
    expect(container.innerHTML).toContain('text-data-negative')
  })

  it('valeur nulle → "+0 €" sur fond positif (signe neutre)', () => {
    const { container } = render(<CashDeltaBadge value={0} />)
    expect(container.textContent).toMatch(/\+0/)
    expect(container.innerHTML).toContain('bg-data-positive-50')
  })

  it('RÈGLE HARD : la perte n’utilise JAMAIS brand-red (#E93E3A)', () => {
    const { container } = render(<CashDeltaBadge value={-1000} />)
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
    expect(container.innerHTML).not.toContain('brand-red')
  })

  it('cancelled → barré + atténué', () => {
    const { container } = render(<CashDeltaBadge value={-18} cancelled />)
    expect(container.innerHTML).toContain('line-through')
    expect(container.innerHTML).toContain('opacity-50')
  })

  it('taille lg', () => {
    const { container } = render(<CashDeltaBadge value={5380} size="lg" />)
    expect(container.innerHTML).toContain('text-[16px]')
  })

  it('aucune violation a11y', async () => {
    const { container } = render(<CashDeltaBadge value={300} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
