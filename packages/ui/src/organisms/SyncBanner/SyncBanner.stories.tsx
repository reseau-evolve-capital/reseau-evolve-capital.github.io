import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'

import { SyncBanner } from './SyncBanner'

const meta: Meta<typeof SyncBanner> = {
  title: 'Organisms/SyncBanner',
  component: SyncBanner,
  tags: ['autodocs'],
  args: {
    syncedAt: new Date(Date.now() - 35 * 60 * 1000),
    userRole: 'treasurer',
    onSync: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-md p-4 bg-bg-page">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof SyncBanner>

/** Rôle trésorier : bandeau visible. Le clic déclenche onSync. */
export const Treasurer: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: 'Actualiser les données' })
    await userEvent.click(button)
    await expect(args.onSync).toHaveBeenCalled()
  },
}

/** Rôle membre : le bandeau ne s'affiche jamais (return null). */
export const Member: Story = {
  args: { userRole: 'member' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole('button', { name: 'Actualiser les données' })).toBeNull()
  },
}

/** Synchronisation en cours : spinner + bouton désactivé. */
export const Syncing: Story = {
  args: { isSyncing: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: 'Actualiser les données' })
    await expect(button).toBeDisabled()
  },
}

/** Jamais synchronisé : fallback "—". */
export const NeverSynced: Story = {
  args: { syncedAt: null },
}

/** Erreur de rate-limit (429) affichée inline sur token négatif lisible (B4), role=alert. */
export const RateLimited: Story = {
  args: {
    errorMessage: 'Rate limit atteint. Réessaie dans quelques minutes.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // B4 : l'erreur est annoncée en assertif (role=alert), plus en simple status discret.
    await expect(canvas.getByRole('alert')).toBeTruthy()
  },
}

/** Échec de synchronisation : message d'erreur visible (token négatif), distinct du gris discret. */
export const SyncFailed: Story = {
  args: {
    errorMessage: 'La synchronisation a échoué. Réessaie ?',
  },
}
