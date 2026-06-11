import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { DashboardMetricsRibbon } from './DashboardMetricsRibbon'

expect.extend(toHaveNoViolations)

const ITEMS = [
  { label: 'Investi', value: '12 400 €' },
  { label: 'Plus-value', value: '+2 854 €' },
  { label: 'Cotisé', value: '9 600 €' },
]

describe('DashboardMetricsRibbon — rendu', () => {
  it('rend une liste de définitions <dl> avec un <dt>/<dd> par item', () => {
    const { container } = render(<DashboardMetricsRibbon items={ITEMS} />)
    expect(container.querySelector('dl')).not.toBeNull()
    expect(container.querySelectorAll('dt')).toHaveLength(3)
    expect(container.querySelectorAll('dd')).toHaveLength(3)
  })

  it('affiche chaque label et chaque valeur', () => {
    render(<DashboardMetricsRibbon items={ITEMS} />)
    for (const item of ITEMS) {
      expect(screen.getByText(item.label)).toBeInTheDocument()
      expect(screen.getByText(item.value)).toBeInTheDocument()
    }
  })

  it('items vides → ne rend rien (jamais de card vide)', () => {
    const { container } = render(<DashboardMetricsRibbon items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('la 1ʳᵉ cellule n’a pas de séparateur, les suivantes oui (border-l)', () => {
    const { container } = render(<DashboardMetricsRibbon items={ITEMS} />)
    const cells = Array.from(container.querySelectorAll('dl > div'))
    expect(cells).toHaveLength(3)
    expect(cells[0]?.className).not.toContain('border-l')
    expect(cells[1]?.className).toContain('border-l')
    expect(cells[2]?.className).toContain('border-l')
  })
})

describe('DashboardMetricsRibbon — accessibilité (jest-axe)', () => {
  it('pas de violations axe', async () => {
    const { container } = render(<DashboardMetricsRibbon items={ITEMS} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
