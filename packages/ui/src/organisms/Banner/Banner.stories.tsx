import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'

import { Button } from '../../atoms/Button'
import { Banner } from './Banner'

const meta: Meta<typeof Banner> = {
  title: 'Organisms/Banner',
  component: Banner,
  tags: ['autodocs'],
  args: {
    variant: 'info',
    title: 'Information',
    message: 'Ceci est un message d’information du club.',
  },
  decorators: [
    (Story) => (
      <div className="max-w-lg p-4 bg-bg-page">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof Banner>

/** Variante info (neutre). */
export const Info: Story = {}

/** Variante succès — ex. cotisation enregistrée. */
export const Success: Story = {
  args: { variant: 'success', title: 'Cotisation enregistrée', message: 'Merci, c’est à jour.' },
}

/** Variante warning — ex. relance d’impayé. text-data-warning-strong = AA-safe sur fond clair. */
export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Cotisation en retard',
    message: 'Une cotisation de janvier reste à régler.',
  },
}

/** Variante error — role="alert", annoncée en assertif. */
export const Error: Story = {
  args: {
    variant: 'error',
    title: 'Synchronisation impossible',
    message: 'Réessaie dans quelques minutes.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('alert')).toBeTruthy()
  },
}

/** Variante sync — préréglage repris par SyncBanner. */
export const Sync: Story = {
  args: { variant: 'sync', title: undefined, message: 'Synchronisé il y a 35 minutes' },
}

/** Bannière bloquante (accès suspendu) avec une action. */
export const WithAction: Story = {
  args: {
    variant: 'warning',
    title: 'Accès limité',
    message: 'Contacte ton trésorier pour rétablir l’accès.',
    actions: <Button size="sm">Contacter</Button>,
  },
}

/** Dismissible : le clic sur Fermer déclenche onDismiss. */
export const Dismissible: Story = {
  args: { dismissible: true, onDismiss: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Fermer' }))
    await expect(args.onDismiss).toHaveBeenCalled()
  },
}
