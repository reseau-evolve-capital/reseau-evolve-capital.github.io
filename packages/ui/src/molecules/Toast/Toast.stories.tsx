import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect, waitFor } from 'storybook/test'
import * as React from 'react'

import { Button } from '../../atoms/Button'
import { ToastProvider, useToast, type ToastVariant, type ToastOptions } from './ToastProvider'

// Démo : un bouton qui déclenche un toast via l'API impérative useToast().
function ToastDemo({
  variant,
  options,
  label = 'Afficher le toast',
}: {
  variant: ToastVariant
  options: ToastOptions
  label?: string
}) {
  const toast = useToast()
  return <Button onClick={() => toast[variant](options)}>{label}</Button>
}

const meta: Meta<typeof ToastDemo> = {
  title: 'Molecules/Toast',
  component: ToastDemo,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ToastProvider>
        <div className="min-h-[240px] p-4 bg-bg-page">
          <Story />
        </div>
      </ToastProvider>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof ToastDemo>

/** Succès : auto-dismiss après 4000ms. Le clic le fait apparaître. */
export const Success: Story = {
  args: {
    variant: 'success',
    options: { title: 'Cotisation enregistrée', message: 'C’est à jour.' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Afficher le toast' }))
    await expect(await canvas.findByText('Cotisation enregistrée')).toBeTruthy()
  },
}

/** Erreur : PERSISTANT (pas d'auto-dismiss). role="alert". */
export const Error: Story = {
  args: {
    variant: 'error',
    options: { title: 'Échec de la synchronisation', message: 'Réessaie plus tard.' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Afficher le toast' }))
    await expect(await canvas.findByRole('alert')).toBeTruthy()
  },
}

/** Info avec action : le clic sur l'action déclenche le callback. */
export const WithAction: Story = {
  args: {
    variant: 'info',
    options: {
      title: 'Document prêt',
      message: 'Ton attestation est disponible.',
      action: { label: 'Télécharger', onClick: fn() },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Afficher le toast' }))
    const action = await canvas.findByRole('button', { name: 'Télécharger' })
    await userEvent.click(action)
  },
}

/** Warning : auto-dismiss après 6000ms. */
export const Warning: Story = {
  args: {
    variant: 'warning',
    options: { title: 'Cotisation en retard', message: 'Une échéance reste à régler.' },
  },
}

/** Fermeture manuelle : le bouton fermer retire le toast. */
export const Dismiss: Story = {
  args: { variant: 'info', options: { title: 'À fermer', message: 'Clique sur la croix.' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Afficher le toast' }))
    await canvas.findByText('À fermer')
    await userEvent.click(canvas.getByRole('button', { name: 'Fermer la notification' }))
    await waitFor(() => expect(canvas.queryByText('À fermer')).toBeNull())
  },
}

/** Escape ferme le toast le plus récent. */
export const EscapeDismiss: Story = {
  args: { variant: 'error', options: { title: 'Ferme-moi avec Échap' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Afficher le toast' }))
    await canvas.findByText('Ferme-moi avec Échap')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(canvas.queryByText('Ferme-moi avec Échap')).toBeNull())
  },
}
