import type { Meta, StoryObj } from '@storybook/react'
import { within, expect } from 'storybook/test'
import { Sidebar } from './Sidebar'
import type { NavItem } from '../BottomNav'

const items: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Portefeuille', href: '/portfolio', icon: 'ChartPie' },
  { label: 'Cotisations', href: '/contributions', icon: 'Calendar', notif: true },
  { label: 'Documents', href: '/documents', icon: 'FileText', disabled: true },
]

const meta: Meta<typeof Sidebar> = {
  title: 'Organisms/Sidebar',
  component: Sidebar,
  parameters: {
    // La sidebar est `hidden md:flex` — viewport desktop pour la voir.
    viewport: { defaultViewport: 'desktop' },
  },
  args: {
    items,
    activeHref: '/dashboard',
    clubActif: { name: 'Club Evolve Paris', meta: '24 membres' },
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
type Story = StoryObj<typeof Sidebar>

/** Dashboard actif, item Cotisations avec pastille, item Documents désactivé, carte club. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // L'entrée active porte aria-current="page".
    const dashboard = canvas.getByRole('link', { name: /dashboard/i })
    expect(dashboard).toHaveAttribute('aria-current', 'page')
    // L'entrée désactivée n'est pas un lien.
    expect(canvas.queryByRole('link', { name: /documents/i })).toBeNull()
    // La carte « Club actif » est présente.
    expect(canvas.getByText('Club Evolve Paris')).toBeVisible()
  },
}

/** Sans carte « Club actif ». */
export const SansClub: Story = {
  args: {
    clubActif: undefined,
  },
}
