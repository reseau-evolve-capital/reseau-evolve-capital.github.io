import { render, screen, waitFor, within } from '@testing-library/react'
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

  it('ne rend pas le bouton feedback quand onFeedback est absent (non destructif)', () => {
    render(<AppTopbar user={user} />)
    expect(screen.queryByRole('button', { name: 'Retour' })).toBeNull()
  })

  it('rend le bouton feedback avec son aria-label par défaut quand onFeedback est fourni', () => {
    render(<AppTopbar user={user} onFeedback={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Retour' })).toBeTruthy()
  })

  it('respecte feedbackLabel personnalisé', () => {
    render(<AppTopbar user={user} onFeedback={vi.fn()} feedbackLabel="Donner mon avis" />)
    expect(screen.getByRole('button', { name: 'Donner mon avis' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Retour' })).toBeNull()
  })

  it('expose un seul landmark header', () => {
    const { container } = render(<AppTopbar user={user} />)
    expect(container.querySelectorAll('header')).toHaveLength(1)
  })
})

describe('AppTopbar — feedback', () => {
  it('appelle onFeedback au clic sur le bouton feedback', async () => {
    const u = userEvent.setup()
    const onFeedback = vi.fn()
    render(<AppTopbar user={user} onFeedback={onFeedback} />)
    await u.click(screen.getByRole('button', { name: 'Retour' }))
    expect(onFeedback).toHaveBeenCalledTimes(1)
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

describe('AppTopbar — entrée votes (onVotes / pollsToVote)', () => {
  it("n'affiche pas l'entrée « Votes » quand onVotes est absent (non destructif)", async () => {
    const u = userEvent.setup()
    render(<AppTopbar user={user} />)
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /profil/i })).toBeTruthy()
    })
    expect(screen.queryByRole('menuitem', { name: /votes/i })).toBeNull()
  })

  it('affiche « Votes » dans le menu et appelle onVotes au clic', async () => {
    const u = userEvent.setup()
    const onVotes = vi.fn()
    render(<AppTopbar user={user} onVotes={onVotes} />)
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    const votesItem = await screen.findByRole('menuitem', { name: /votes/i })
    await u.click(votesItem)
    expect(onVotes).toHaveBeenCalledTimes(1)
  })

  it('rend Votes entre Profil et Déconnexion (ordre du menu)', async () => {
    const u = userEvent.setup()
    render(<AppTopbar user={user} onVotes={vi.fn()} />)
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    await screen.findByRole('menuitem', { name: /votes/i })
    const items = screen.getAllByRole('menuitem').map((el) => el.textContent ?? '')
    const iProfil = items.findIndex((t) => /profil/i.test(t))
    const iVotes = items.findIndex((t) => /votes/i.test(t))
    const iLogout = items.findIndex((t) => /déconnexion/i.test(t))
    expect(iProfil).toBeLessThan(iVotes)
    expect(iVotes).toBeLessThan(iLogout)
  })

  it('pollsToVote > 0 : badge chiffré dans l’entrée + pastille « non lu » sur l’avatar + compte dans l’aria-label du trigger', async () => {
    const u = userEvent.setup()
    render(<AppTopbar user={user} onVotes={vi.fn()} pollsToVote={4} />)
    // Pastille sur l'avatar (decorative) + compte exposé dans le nom accessible du trigger.
    const trigger = screen.getByRole('button', { name: 'Menu utilisateur (4)' })
    expect(trigger.querySelector('[data-testid="topbar-votes-dot"]')).toBeTruthy()
    // Badge chiffré dans l'entrée du menu.
    await u.click(trigger)
    const votesItem = await screen.findByRole('menuitem', { name: /votes \(4\)/i })
    expect(votesItem.textContent).toContain('4')
  })

  it('pollsToVote = 0 : pas de pastille ni de compte (entrée Votes sans badge)', async () => {
    render(<AppTopbar user={user} onVotes={vi.fn()} pollsToVote={0} />)
    const trigger = screen.getByRole('button', { name: 'Menu utilisateur' })
    expect(trigger.querySelector('[data-testid="topbar-votes-dot"]')).toBeNull()
  })

  it('cape le badge à « 9+ » au-delà de 9', async () => {
    const u = userEvent.setup()
    render(<AppTopbar user={user} onVotes={vi.fn()} pollsToVote={12} />)
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur (12)' }))
    const votesItem = await screen.findByRole('menuitem', { name: /votes \(12\)/i })
    expect(votesItem.textContent).toContain('9+')
  })
})

describe('AppTopbar — changer de club (NAV-001)', () => {
  const twoClubs = [
    { id: 'club-a', name: 'Club A', city: 'Paris' },
    { id: 'club-b', name: 'Club B', city: 'Lyon' },
  ]

  it("affiche l'entrée « Changer de club » quand ≥ 2 clubs + onClubChange", async () => {
    const u = userEvent.setup()
    render(<AppTopbar user={user} clubs={twoClubs} activeClubId="club-a" onClubChange={vi.fn()} />)
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    const entry = await screen.findByTestId('topbar-change-club')
    expect(entry.textContent).toMatch(/changer de club/i)
    // Rappel du club actif sous le libellé.
    expect(entry.textContent).toMatch(/club a/i)
  })

  it("n'affiche PAS l'entrée pour un membre mono-club (non destructif)", async () => {
    const u = userEvent.setup()
    render(
      <AppTopbar
        user={user}
        clubs={[{ id: 'club-a', name: 'Club A', city: null }]}
        activeClubId="club-a"
        onClubChange={vi.fn()}
      />
    )
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    await screen.findByRole('menuitem', { name: /profil/i })
    expect(screen.queryByTestId('topbar-change-club')).toBeNull()
  })

  it("n'affiche PAS l'entrée si onClubChange est absent (même avec ≥ 2 clubs)", async () => {
    const u = userEvent.setup()
    render(<AppTopbar user={user} clubs={twoClubs} activeClubId="club-a" />)
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    await screen.findByRole('menuitem', { name: /profil/i })
    expect(screen.queryByTestId('topbar-change-club')).toBeNull()
  })

  it('ouvre le sélecteur, surligne le club actif et remonte le club choisi', async () => {
    const u = userEvent.setup()
    const onClubChange = vi.fn()
    render(
      <AppTopbar user={user} clubs={twoClubs} activeClubId="club-a" onClubChange={onClubChange} />
    )
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    await u.click(await screen.findByTestId('topbar-change-club'))
    const dialog = await screen.findByRole('dialog')
    // Club actif marqué aria-current (surlignage data-positive).
    const active = within(dialog).getByText('Club A').closest('button')
    expect(active).toHaveAttribute('aria-current', 'true')
    // Choisir l'autre club remonte son id.
    await u.click(within(dialog).getByText('Club B'))
    expect(onClubChange).toHaveBeenCalledWith('club-b')
  })

  it('ne rappelle PAS onClubChange si on re-choisit le club déjà actif', async () => {
    const u = userEvent.setup()
    const onClubChange = vi.fn()
    render(
      <AppTopbar user={user} clubs={twoClubs} activeClubId="club-a" onClubChange={onClubChange} />
    )
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
    await u.click(await screen.findByTestId('topbar-change-club'))
    const dialog = await screen.findByRole('dialog')
    await u.click(within(dialog).getByText('Club A'))
    expect(onClubChange).not.toHaveBeenCalled()
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

  it('avec entrée Votes + pastille non lue : pas de violations axe', async () => {
    const { container } = render(
      <AppTopbar
        user={user}
        onVotes={vi.fn()}
        pollsToVote={4}
        syncLabel="Synchronisé il y a 14 min"
        dateLabel="Vendredi 24 avril 2026"
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('multi-club (entrée changer de club) : pas de violations axe', async () => {
    const { container } = render(
      <AppTopbar
        user={user}
        clubs={[
          { id: 'club-a', name: 'Club A', city: 'Paris' },
          { id: 'club-b', name: 'Club B', city: 'Lyon' },
        ]}
        activeClubId="club-a"
        onClubChange={vi.fn()}
        syncLabel="Synchronisé il y a 14 min"
        dateLabel="Vendredi 24 avril 2026"
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
