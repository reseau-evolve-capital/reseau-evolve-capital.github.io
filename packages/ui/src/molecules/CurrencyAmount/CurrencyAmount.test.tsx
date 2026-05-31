import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { CurrencyAmount } from './CurrencyAmount'

expect.extend(toHaveNoViolations)

describe('CurrencyAmount — rendu texte', () => {
  it('montant positif → "1 234,56 €"', () => {
    const { container } = render(<CurrencyAmount amount={1234.56} />)
    // NBSP (U+00A0) ou espace fine insécable (U+202F) selon l'env Intl — les deux sont acceptés
    expect(container.textContent).toMatch(/1[\s  ]234,56/)
  })

  it('montant négatif → commence par "−" (U+2212)', () => {
    const { container } = render(<CurrencyAmount amount={-1234.56} />)
    expect(container.textContent).toMatch(/^−1/)
  })

  it('showSign + montant positif → commence par "+"', () => {
    const { container } = render(<CurrencyAmount amount={1234.56} showSign />)
    expect(container.textContent).toMatch(/^\+1/)
  })

  it('NaN → "—" (tiret cadratin, fallback)', () => {
    const { container } = render(<CurrencyAmount amount={NaN} />)
    expect(container.textContent).toBe('—')
  })

  it('Infinity → "—" (valeur non finie)', () => {
    const { container } = render(<CurrencyAmount amount={Infinity} />)
    expect(container.textContent).toBe('—')
  })

  it('zéro sans showSign → "0,00 €" sans signe', () => {
    const { container } = render(<CurrencyAmount amount={0} />)
    expect(container.textContent).not.toMatch(/^[+−]/)
    expect(container.textContent).toMatch(/0,00/)
  })

  it('zéro avec showSign → pas de signe (ni + ni −)', () => {
    const { container } = render(<CurrencyAmount amount={0} showSign />)
    expect(container.textContent).not.toMatch(/^[+−]/)
  })

  it('aria-label correspond au texte affiché', () => {
    const { container } = render(<CurrencyAmount amount={1234.56} />)
    const span = container.querySelector('span')!
    expect(span.getAttribute('aria-label')).toBe(span.textContent)
  })
})

describe('CurrencyAmount — règle hex (pas de hex codé en dur)', () => {
  it('innerHTML ne contient aucun code couleur hex brut', () => {
    const { container } = render(<CurrencyAmount amount={1234.56} />)
    expect(container.innerHTML).not.toMatch(/#[0-9A-Fa-f]{6}/)
  })
})

describe('CurrencyAmount — accessibilité (jest-axe)', () => {
  it('pas de violations axe (montant positif)', async () => {
    const { container } = render(<CurrencyAmount amount={1234.56} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('pas de violations axe (montant négatif)', async () => {
    const { container } = render(<CurrencyAmount amount={-1234.56} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('pas de violations axe (NaN → fallback)', async () => {
    const { container } = render(<CurrencyAmount amount={NaN} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('pas de violations axe (size xl)', async () => {
    const { container } = render(<CurrencyAmount amount={65574.87} size="xl" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
