import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { OpChip } from './OpChip'

expect.extend(toHaveNoViolations)

describe('OpChip', () => {
  it('rend une pastille décorative (aria-hidden) à la taille demandée', () => {
    const { container } = render(<OpChip type="contribution" size={44} />)
    const span = container.querySelector('span[aria-hidden="true"]') as HTMLElement
    expect(span).toBeTruthy()
    expect(span.style.width).toBe('44px')
    expect(span.style.height).toBe('44px')
  })

  it('utilise les classes token-driven du type (cotisation = data-positive)', () => {
    const { container } = render(<OpChip type="contribution" />)
    expect(container.innerHTML).toContain('bg-data-positive-50')
    expect(container.innerHTML).toContain('text-data-positive')
  })

  it('dividende utilise le token --data-dividend-fg, jamais un inline color', () => {
    const { container } = render(<OpChip type="dividend_cash" />)
    expect(container.innerHTML).toContain('bg-data-dividend-50')
    expect(container.innerHTML).toContain('text-data-dividend-fg')
    expect(container.querySelector('[style*="color"]')).toBeNull()
  })

  it('pénalité ne contient JAMAIS brand-red (#E93E3A)', () => {
    const { container } = render(<OpChip type="penalty" />)
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
    expect(container.innerHTML).not.toContain('brand-red')
  })

  it('clé inconnue → repli neutre (correction), pas de crash', () => {
    const { container } = render(<OpChip type="inexistant" />)
    expect(container.innerHTML).toContain('bg-data-neutral-50')
  })

  it('cancelled applique le grayscale', () => {
    const { container } = render(<OpChip type="sell" cancelled />)
    expect(container.innerHTML).toContain('grayscale')
  })

  it('aucune violation a11y', async () => {
    const { container } = render(<OpChip type="contribution" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
