import type { Meta, StoryObj } from '@storybook/react'
import { within, expect } from 'storybook/test'
import { BottomNav, type NavItem } from './BottomNav'

const items: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Portefeuille', href: '/portfolio', icon: 'ChartPie' },
  { label: 'Cotisations', href: '/contributions', icon: 'Calendar' },
]

const meta: Meta<typeof BottomNav> = {
  title: 'Organisms/BottomNav',
  component: BottomNav,
  parameters: {
    // La barre est `md:hidden` — on force un viewport mobile pour la voir.
    viewport: { defaultViewport: 'mobile1' },
  },
  args: {
    items,
  },
}
export default meta
type Story = StoryObj<typeof BottomNav>

/** Onglet Dashboard actif */
export const Default: Story = {
  args: {
    activeHref: '/dashboard',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // L'onglet actif (Dashboard) doit porter aria-current="page"
    const dashboard = canvas.getByRole('link', { name: /dashboard/i })
    expect(dashboard).toHaveAttribute('aria-current', 'page')
    // Les autres onglets ne doivent PAS être marqués courants
    const portefeuille = canvas.getByRole('link', { name: /portefeuille/i })
    expect(portefeuille).not.toHaveAttribute('aria-current')
  },
}
