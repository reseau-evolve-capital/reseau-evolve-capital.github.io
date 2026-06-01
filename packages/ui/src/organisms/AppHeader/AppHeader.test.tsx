import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { AppHeader } from './AppHeader'
import type { NavItem } from '../BottomNav'

expect.extend(toHaveNoViolations)

// Radix DropdownMenu s'appuie sur des API pointer absentes de jsdom.
// On les polyfill localement pour pouvoir ouvrir le menu via userEvent.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => undefined
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => undefined
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => undefined
  }
})

const items: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Portefeuille', href: '/portfolio', icon: 'ChartPie' },
  { label: 'Cotisations', href: '/contributions', icon: 'Calendar' },
]

const user = { fullName: 'Alice Durand', avatarUrl: null }

describe('AppHeader — rendu', () => {
  it('affiche les liens de navigation desktop', () => {
    render(<AppHeader items={items} activeHref="/dashboard" user={user} />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Portefeuille' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Cotisations' })).toBeTruthy()
  })

  it('marque le lien actif via aria-current=page', () => {
    render(<AppHeader items={items} activeHref="/portfolio" user={user} />)
    expect(screen.getByRole('link', { name: 'Portefeuille' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('expose le trigger du menu utilisateur avec un aria-label', () => {
    render(<AppHeader items={items} activeHref="/dashboard" user={user} />)
    expect(screen.getByRole('button', { name: 'Menu utilisateur' })).toBeTruthy()
  })
})

describe('AppHeader — menu utilisateur', () => {
  it('ouvre le menu au clic et affiche Profil / Déconnexion', async () => {
    const u = userEvent.setup()
    render(<AppHeader items={items} activeHref="/dashboard" user={user} />)
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /profil/i })).toBeTruthy()
      expect(screen.getByRole('menuitem', { name: /déconnexion/i })).toBeTruthy()
    })
  })

  it('appelle onLogout au clic sur Déconnexion', async () => {
    const u = userEvent.setup()
    const onLogout = vi.fn()
    render(<AppHeader items={items} activeHref="/dashboard" user={user} onLogout={onLogout} />)
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    const logout = await screen.findByRole('menuitem', { name: /déconnexion/i })
    await u.click(logout)
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('appelle onProfile au clic sur Profil', async () => {
    const u = userEvent.setup()
    const onProfile = vi.fn()
    render(<AppHeader items={items} activeHref="/dashboard" user={user} onProfile={onProfile} />)
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    const profile = await screen.findByRole('menuitem', { name: /profil/i })
    await u.click(profile)
    expect(onProfile).toHaveBeenCalledTimes(1)
  })
})

describe('AppHeader — entrée admin (canAccessAdmin)', () => {
  it('affiche « Espace trésorier » quand canAccessAdmin est true', async () => {
    const u = userEvent.setup()
    const onAdmin = vi.fn()
    render(
      <AppHeader
        items={items}
        activeHref="/dashboard"
        user={user}
        canAccessAdmin={true}
        onAdmin={onAdmin}
      />
    )
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    const adminItem = await screen.findByRole('menuitem', { name: /espace trésorier/i })
    expect(adminItem).toBeTruthy()
    await u.click(adminItem)
    expect(onAdmin).toHaveBeenCalledTimes(1)
  })

  it("n'affiche pas « Espace trésorier » quand canAccessAdmin est absent", async () => {
    const u = userEvent.setup()
    render(<AppHeader items={items} activeHref="/dashboard" user={user} />)
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /profil/i })).toBeTruthy()
    })
    expect(screen.queryByRole('menuitem', { name: /espace trésorier/i })).toBeNull()
  })
})

describe('AppHeader — accessibilité (jest-axe)', () => {
  it('état fermé : pas de violations axe', async () => {
    const { container } = render(<AppHeader items={items} activeHref="/dashboard" user={user} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
