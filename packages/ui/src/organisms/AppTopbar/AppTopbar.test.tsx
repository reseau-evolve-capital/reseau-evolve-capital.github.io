import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { AppTopbar } from './AppTopbar'

expect.extend(toHaveNoViolations)

// Radix DropdownMenu s'appuie sur des API pointer absentes de jsdom.
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

const user = { fullName: 'Alice Durand', avatarUrl: null }

describe('AppTopbar — rendu', () => {
  it('expose le trigger du menu utilisateur avec un aria-label', () => {
    render(<AppTopbar user={user} />)
    expect(screen.getByRole('button', { name: 'Menu utilisateur' })).toBeTruthy()
  })

  it('affiche le statut de synchronisation et la pilule date', () => {
    render(
      <AppTopbar
        user={user}
        syncLabel="Synchronisé il y a 14 min"
        dateLabel="Vendredi 24 avril 2026"
      />
    )
    expect(screen.getByText('Synchronisé il y a 14 min')).toBeTruthy()
    expect(screen.getByText('Vendredi 24 avril 2026')).toBeTruthy()
  })

  it('rend le slot themeToggle fourni', () => {
    render(<AppTopbar user={user} themeToggle={<button>toggle-thème</button>} />)
    expect(screen.getByRole('button', { name: 'toggle-thème' })).toBeTruthy()
  })

  it('expose un seul landmark header', () => {
    const { container } = render(<AppTopbar user={user} />)
    expect(container.querySelectorAll('header')).toHaveLength(1)
  })
})

describe('AppTopbar — menu utilisateur', () => {
  it('ouvre le menu au clic et affiche Profil / Déconnexion', async () => {
    const u = userEvent.setup()
    render(<AppTopbar user={user} />)
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /profil/i })).toBeTruthy()
      expect(screen.getByRole('menuitem', { name: /déconnexion/i })).toBeTruthy()
    })
  })

  it('appelle onLogout au clic sur Déconnexion', async () => {
    const u = userEvent.setup()
    const onLogout = vi.fn()
    render(<AppTopbar user={user} onLogout={onLogout} />)
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    const logout = await screen.findByRole('menuitem', { name: /déconnexion/i })
    await u.click(logout)
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})

describe('AppTopbar — entrée admin (canAccessAdmin)', () => {
  it('affiche « Espace trésorier » quand canAccessAdmin est true', async () => {
    const u = userEvent.setup()
    const onAdmin = vi.fn()
    render(<AppTopbar user={user} canAccessAdmin onAdmin={onAdmin} />)
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    const adminItem = await screen.findByRole('menuitem', { name: /espace trésorier/i })
    await u.click(adminItem)
    expect(onAdmin).toHaveBeenCalledTimes(1)
  })

  it("n'affiche pas « Espace trésorier » quand canAccessAdmin est absent", async () => {
    const u = userEvent.setup()
    render(<AppTopbar user={user} />)
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /profil/i })).toBeTruthy()
    })
    expect(screen.queryByRole('menuitem', { name: /espace trésorier/i })).toBeNull()
  })
})

describe('AppTopbar — accessibilité (jest-axe)', () => {
  it('état fermé : pas de violations axe', async () => {
    const { container } = render(
      <AppTopbar
        user={user}
        syncLabel="Synchronisé il y a 14 min"
        dateLabel="Vendredi 24 avril 2026"
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
