import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { CashImpactPanel } from './CashImpactPanel'

expect.extend(toHaveNoViolations)

describe('CashImpactPanel', () => {
  it('valeur positive → badge +N et note', () => {
    const { container } = render(<CashImpactPanel value={300} note="Cotisation encaissée." />)
    expect(container.textContent).toMatch(/\+300/)
    expect(container.textContent).toContain('Cotisation encaissée.')
    expect(container.textContent).toContain('Impact sur le solde espèces')
  })

  it('valeur négative → MINUS U+2212 (jamais le trait d’union)', () => {
    const { container } = render(<CashImpactPanel value={-233229} />)
    expect(container.textContent).toContain('−')
    expect(container.textContent).not.toContain('-233')
  })

  it('valeur absente → « — », jamais NaN ni de badge coloré', () => {
    const { container } = render(<CashImpactPanel value={null} />)
    expect(container.textContent).toContain('—')
    expect(container.textContent).not.toContain('NaN')
    expect(container.innerHTML).not.toContain('bg-data-positive-50')
  })

  it('NaN traité comme absent', () => {
    const { container } = render(<CashImpactPanel value={NaN} />)
    expect(container.textContent).toContain('—')
    expect(container.textContent).not.toContain('NaN')
  })

  it('caption personnalisable (i18n)', () => {
    const { container } = render(<CashImpactPanel value={0} caption="Cash impact" />)
    expect(container.textContent).toContain('Cash impact')
  })

  it('jamais de rouge brand en dur', () => {
    const { container } = render(<CashImpactPanel value={-50} />)
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
  })

  it('aucune violation a11y', async () => {
    const { container } = render(<CashImpactPanel value={300} note="ok" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
