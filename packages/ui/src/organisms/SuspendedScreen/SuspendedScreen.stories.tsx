import type { Meta, StoryObj } from '@storybook/react'
import { SuspendedScreen } from './SuspendedScreen'

const meta: Meta<typeof SuspendedScreen> = {
  title: 'Organisms/SuspendedScreen',
  component: SuspendedScreen,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: { treasurerMailto: 'mailto:tresorier@cercle-arago.fr', signOutHref: '#' },
}
export default meta
type Story = StoryObj<typeof SuspendedScreen>

export const Default: Story = {}

/** Sans CTA trésorier (mailto absent) : seul le lien de déconnexion reste. */
export const SansContact: Story = {
  args: { treasurerMailto: undefined },
}

/** Vue mobile (≈375px) — toujours sombre, centrée. */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
}
