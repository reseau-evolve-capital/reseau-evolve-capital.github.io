import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { BottomNav, type NavItem } from './BottomNav'

expect.extend(toHaveNoViolations)

const items: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Portefeuille', href: '/portfolio', icon: 'ChartPie' },
  { label: 'Cotisations', href: '/contributions', icon: 'Calendar' },
]

describe('BottomNav — rendu', () => {
  it('affiche les 3 onglets', () => {
    const { getByText } = render(<BottomNav items={items} activeHref="/dashboard" />)
    expect(getByText('Dashboard')).toBeTruthy()
    expect(getByText('Portefeuille')).toBeTruthy()
    expect(getByText('Cotisations')).toBeTruthy()
  })

  it("marque l'onglet actif via aria-current=page", () => {
    const { getByText } = render(<BottomNav items={items} activeHref="/portfolio" />)
    const active = getByText('Portefeuille').closest('a')
    const inactive = getByText('Dashboard').closest('a')
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(inactive).not.toHaveAttribute('aria-current')
  })

  it('rend un onglet désactivé en <span> non cliquable (aria-disabled)', () => {
    const withDisabled: NavItem[] = [
      ...items,
      { label: 'Réseau', href: '/reseau', icon: 'Waypoints', disabled: true },
    ]
    const { getByText } = render(<BottomNav items={withDisabled} activeHref="/dashboard" />)
    const tab = getByText('Réseau').closest('span[aria-disabled]')
    // Teaser : pas de lien (non cliquable), aria-disabled posé.
    expect(tab).toBeTruthy()
    expect(getByText('Réseau').closest('a')).toBeNull()
  })
})

describe('BottomNav — accessibilité (jest-axe)', () => {
  it('pas de violations axe', async () => {
    const { container } = render(<BottomNav items={items} activeHref="/dashboard" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
