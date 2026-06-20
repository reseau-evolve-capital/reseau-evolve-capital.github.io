import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'
import { AppTopbar } from './AppTopbar'
import { ThemeToggle } from '../../atoms/ThemeToggle'

const meta: Meta<typeof AppTopbar> = {
  title: 'Organisms/AppTopbar',
  component: AppTopbar,
  args: {
    user: { fullName: 'Alice Durand', avatarUrl: null },
    syncLabel: 'Synchronisé il y a 14 min',
    dateLabel: 'Vendredi 24 avril 2026',
    themeToggle: <ThemeToggle />,
    onProfile: fn(),
    onLogout: fn(),
    onAdmin: fn(),
    onFeedback: fn(),
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-bg-page">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof AppTopbar>

/** Topbar avec statut sync, pilule date, toggle de thème et menu utilisateur. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole('button', { name: /menu utilisateur/i })
    await userEvent.click(trigger)
    const menu = within(document.body)
    expect(await menu.findByText('Profil')).toBeVisible()
    expect(await menu.findByText('Déconnexion')).toBeVisible()
    // Entrée admin ABSENTE (canAccessAdmin non fourni).
    expect(menu.queryByText('Espace trésorier')).toBeNull()
  },
}

/** Menu avec entrée « Espace trésorier » (rôle staff). */
export const WithAdmin: Story = {
  args: {
    canAccessAdmin: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole('button', { name: /menu utilisateur/i })
    await userEvent.click(trigger)
    const menu = within(document.body)
    expect(await menu.findByText('Espace trésorier')).toBeVisible()
    expect(await menu.findByText('Profil')).toBeVisible()
  },
}

/** Entrée « Votes » dans le menu avatar (entre Profil et Déconnexion) + pastille « non lu »
 *  sur l'avatar et badge chiffré quand des votes attendent une réponse (spec §7). */
export const WithVotes: Story = {
  args: {
    onVotes: fn(),
    pollsToVote: 4,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    // Le compte des votes en attente est exposé dans le nom accessible du trigger.
    const trigger = canvas.getByRole('button', { name: /menu utilisateur \(4\)/i })
    await userEvent.click(trigger)
    const menu = within(document.body)
    const votes = await menu.findByRole('menuitem', { name: /votes \(4\)/i })
    expect(votes).toBeVisible()
    await userEvent.click(votes)
    expect(args.onVotes).toHaveBeenCalledTimes(1)
  },
}

/** NAV-001 — Membre multi-club : entrée « Changer de club » dans le menu avatar (avant
 *  « Déconnexion »), avec rappel du club actif. Ouvre le sélecteur (Dialog/bottom-sheet)
 *  où le club actif est surligné. */
export const MultiClub: Story = {
  args: {
    clubs: [
      { id: 'club-a', name: 'Club Évolve Paris', city: 'Paris' },
      { id: 'club-b', name: 'Club Évolve Lyon', city: 'Lyon' },
    ],
    activeClubId: 'club-a',
    onClubChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const menu = within(document.body)
    // Ouvre le menu avatar.
    await userEvent.click(canvas.getByRole('button', { name: /menu utilisateur/i }))
    // L'entrée « Changer de club » est présente et rappelle le club actif.
    const entry = await menu.findByTestId('topbar-change-club')
    expect(entry).toBeVisible()
    expect(entry.textContent).toMatch(/changer de club/i)
    expect(entry.textContent).toMatch(/club évolve paris/i)
    // L'ouvre → le sélecteur affiche les deux clubs.
    await userEvent.click(entry)
    const dialog = await menu.findByRole('dialog')
    expect(within(dialog).getByText('Club Évolve Paris')).toBeVisible()
    const lyon = within(dialog).getByText('Club Évolve Lyon')
    expect(lyon).toBeVisible()
    // Choisir un autre club déclenche onClubChange avec son id.
    await userEvent.click(lyon)
    expect(args.onClubChange).toHaveBeenCalledWith('club-b')
  },
}

/** NAV-001 — Membre mono-club : AUCUNE entrée « Changer de club » (non destructif). */
export const SingleClub: Story = {
  args: {
    clubs: [{ id: 'club-a', name: 'Club Évolve Paris', city: 'Paris' }],
    activeClubId: 'club-a',
    onClubChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const menu = within(document.body)
    await userEvent.click(canvas.getByRole('button', { name: /menu utilisateur/i }))
    expect(await menu.findByText('Profil')).toBeVisible()
    expect(menu.queryByTestId('topbar-change-club')).toBeNull()
  },
}

/** Point d'entrée feedback : l'icône `MessageCircle` est visible à côté de l'avatar
 *  (desktop ET mobile) et déclenche `onFeedback`. */
export const WithFeedback: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const feedback = canvas.getByRole('button', { name: /retour/i })
    expect(feedback).toBeVisible()
    await userEvent.click(feedback)
    expect(args.onFeedback).toHaveBeenCalledTimes(1)
  },
}
