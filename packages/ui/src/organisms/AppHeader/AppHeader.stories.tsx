import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'
import { AppHeader } from './AppHeader'
import type { NavItem } from '../BottomNav'

const items: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Portefeuille', href: '/portfolio', icon: 'ChartPie' },
  { label: 'Cotisations', href: '/contributions', icon: 'Calendar' },
]

const meta: Meta<typeof AppHeader> = {
  title: 'Organisms/AppHeader',
  component: AppHeader,
  args: {
    items,
    user: { fullName: 'Alice Durand', avatarUrl: null },
    onProfile: fn(),
    onLogout: fn(),
    onAdmin: fn(),
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
type Story = StoryObj<typeof AppHeader>

/** Onglet Dashboard actif, utilisateur sans avatar (initiales) */
export const Default: Story = {
  args: {
    activeHref: '/dashboard',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Ouvre le menu utilisateur (Radix rend le contenu dans un Portal sur body)
    const trigger = canvas.getByRole('button', { name: /menu utilisateur/i })
    await userEvent.click(trigger)
    // Profil + Déconnexion deviennent visibles
    const menu = within(document.body)
    expect(await menu.findByText('Profil')).toBeVisible()
    expect(await menu.findByText('Déconnexion')).toBeVisible()
    // L'entrée admin est ABSENTE (canAccessAdmin non fourni)
    expect(menu.queryByText('Espace trésorier')).toBeNull()
  },
}

/** Menu avec entrée « Espace trésorier » (rôle staff) */
export const WithAdmin: Story = {
  args: {
    activeHref: '/dashboard',
    canAccessAdmin: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Ouvre le menu utilisateur (Radix rend le contenu dans un Portal sur body)
    const trigger = canvas.getByRole('button', { name: /menu utilisateur/i })
    await userEvent.click(trigger)
    // L'entrée admin doit être visible, avant Profil
    const menu = within(document.body)
    expect(await menu.findByText('Espace trésorier')).toBeVisible()
    expect(await menu.findByText('Profil')).toBeVisible()
    expect(await menu.findByText('Déconnexion')).toBeVisible()
  },
}
