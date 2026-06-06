import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Sidebar } from './Sidebar'
import type { NavItem } from '../BottomNav'

expect.extend(toHaveNoViolations)

const items: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Portefeuille', href: '/portfolio', icon: 'ChartPie' },
  { label: 'Cotisations', href: '/contributions', icon: 'Calendar', notif: true },
  { label: 'Documents', href: '/documents', icon: 'FileText', disabled: true },
]

describe('Sidebar — rendu', () => {
  it('affiche les liens cliquables (hors entrée désactivée)', () => {
    render(<Sidebar items={items} activeHref="/dashboard" />)
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /portefeuille/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /cotisations/i })).toBeTruthy()
  })

  it("marque l'entrée active via aria-current=page", () => {
    render(<Sidebar items={items} activeHref="/portfolio" />)
    expect(screen.getByRole('link', { name: /portefeuille/i })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('link', { name: /dashboard/i })).not.toHaveAttribute('aria-current')
  })

  it('rend une entrée désactivée en non-lien avec aria-disabled', () => {
    render(<Sidebar items={items} activeHref="/dashboard" />)
    // « Documents » est disabled : pas de rôle link.
    expect(screen.queryByRole('link', { name: /documents/i })).toBeNull()
    const documents = screen.getByText('Documents').closest('[aria-disabled]')
    expect(documents).toHaveAttribute('aria-disabled', 'true')
    // Badge « Bientôt » présent.
    expect(screen.getByText('Bientôt')).toBeTruthy()
  })

  it('expose une pastille de notification accessible', () => {
    render(<Sidebar items={items} activeHref="/dashboard" />)
    expect(screen.getByText('notification')).toBeTruthy()
  })

  it('affiche la carte « Club actif » seulement si fournie', () => {
    const { rerender } = render(<Sidebar items={items} activeHref="/dashboard" />)
    expect(screen.queryByText('Club actif')).toBeNull()

    rerender(
      <Sidebar
        items={items}
        activeHref="/dashboard"
        clubActif={{ name: 'Club Evolve Paris', meta: '24 membres' }}
      />
    )
    expect(screen.getByText('Club actif')).toBeTruthy()
    expect(screen.getByText('Club Evolve Paris')).toBeTruthy()
    expect(screen.getByText('24 membres')).toBeTruthy()
  })
})

describe('Sidebar — accessibilité (jest-axe)', () => {
  it('pas de violations axe', async () => {
    const { container } = render(
      <Sidebar
        items={items}
        activeHref="/dashboard"
        clubActif={{ name: 'Club Evolve Paris', meta: '24 membres' }}
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
