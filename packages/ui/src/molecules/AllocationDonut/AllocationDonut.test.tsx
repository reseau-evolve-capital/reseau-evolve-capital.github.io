import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { AllocationDonut } from './AllocationDonut'

expect.extend(toHaveNoViolations)

// Recharts ResponsiveContainer utilise ResizeObserver — polyfill minimal pour jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock

const data = [
  { label: 'Technologie', value: 18000, percentage: 0.72 },
  { label: 'Santé', value: 3750, percentage: 0.15 },
  { label: 'Autres', value: 3250, percentage: 0.13 },
]

describe('AllocationDonut', () => {
  it('affiche le total formaté en EUR (NBSP) au centre', () => {
    render(<AllocationDonut data={data} totalValue={25000} />)
    // formatEUR(25000) → "25 000,00 €" avec NBSP comme séparateur milliers
    expect(screen.getByText(/25[\s  ]000,00[\s  ]€/)).toBeInTheDocument()
    expect(screen.getByText('Valeur totale')).toBeInTheDocument()
  })

  it('liste la légende avec libellé + pourcentage', () => {
    render(<AllocationDonut data={data} totalValue={25000} />)
    expect(screen.getByText('Technologie')).toBeInTheDocument()
    // formatPct(0.72, { showSign: false }) → "72,00 %" en fr-FR
    expect(screen.getByText(/72,00[\s  ]%/)).toBeInTheDocument()
  })

  it('expose un role="img" avec aria-label décrivant la répartition', () => {
    render(<AllocationDonut data={data} totalValue={25000} />)
    const img = screen.getByRole('img')
    // L'aria-label contient "Technologie 72,00 %"
    expect(img.getAttribute('aria-label')).toMatch(/Technologie/)
    expect(img.getAttribute('aria-label')).toMatch(/72/)
  })

  it("n'a aucune violation a11y", async () => {
    const { container } = render(<AllocationDonut data={data} totalValue={25000} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("n'utilise aucune couleur hex en dur (tokens CSS only)", () => {
    const { container } = render(<AllocationDonut data={data} totalValue={25000} />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{6}/)
  })

  it('data vide → retourne null (container vide)', () => {
    const { container } = render(<AllocationDonut data={[]} totalValue={0} />)
    expect(container.querySelector('[role="img"]')).toBeNull()
  })
})
