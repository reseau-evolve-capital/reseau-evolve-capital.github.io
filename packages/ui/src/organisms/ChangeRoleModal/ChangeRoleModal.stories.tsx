import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ChangeRoleModal, type ChangeRoleModalProps } from './ChangeRoleModal'

const meta: Meta<typeof ChangeRoleModal> = {
  title: 'Organisms/ChangeRoleModal',
  component: ChangeRoleModal,
  tags: ['autodocs'],
  args: {
    open: true,
    memberName: 'Inès BAMBA',
    currentRole: 'member',
    onConfirm: fn(),
    onOpenChange: fn(),
  },
}
export default meta
type Story = StoryObj<typeof ChangeRoleModal>

/** Rendu de base : titre, encart data-warning, bouton Enregistrer. */
export const Default: Story = {
  args: { canPromotePresident: true },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByRole('dialog')).toBeInTheDocument()
    await expect(body.getByText('Modifier le rôle de Inès BAMBA')).toBeInTheDocument()
    // Encart d'avertissement (role_source='manual') toujours présent.
    await expect(
      body.getByText(
        'Ce rôle a été défini manuellement et ne sera plus écrasé par la synchronisation Google Sheets.'
      )
    ).toBeInTheDocument()
    await expect(body.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  },
}

/** Anti-escalade : un trésorier (canPromotePresident=false) ne voit PAS l'option « Président ». */
export const TreasurerCannotPromotePresident: Story = {
  args: { currentRole: 'member', canPromotePresident: false },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(body.getByRole('combobox', { name: 'Rôle' }))
    await expect(await body.findByRole('option', { name: 'Membre' })).toBeInTheDocument()
    await expect(body.getByRole('option', { name: 'Trésorier' })).toBeInTheDocument()
    // « Président » absent pour un trésorier non habilité.
    await expect(body.queryByRole('option', { name: 'Président' })).not.toBeInTheDocument()
  },
}

/** Un président habilité voit bien l'option « Président ». */
export const PresidentCanPromote: Story = {
  args: { currentRole: 'member', canPromotePresident: true },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(body.getByRole('combobox', { name: 'Rôle' }))
    await expect(await body.findByRole('option', { name: 'Président' })).toBeInTheDocument()
  },
}

/** Sélectionner un nouveau rôle puis Enregistrer → onConfirm reçoit le rôle choisi. */
export const ConfirmNewRole: Story = {
  args: { currentRole: 'member', canPromotePresident: true, onConfirm: fn() },
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(body.getByRole('combobox', { name: 'Rôle' }))
    await userEvent.click(await body.findByRole('option', { name: 'Trésorier' }))
    await userEvent.click(body.getByRole('button', { name: 'Enregistrer' }))
    await expect(args.onConfirm).toHaveBeenCalledWith('treasurer')
  },
}

/** Démo contrôlée : ouvre la modale via un bouton (état réel open/onOpenChange). */
export const Controlled: Story = {
  render: (args: ChangeRoleModalProps) => {
    const [open, setOpen] = React.useState(false)
    return (
      <div className="p-6">
        <button
          type="button"
          className="rounded-md bg-brand-yellow px-4 py-2 text-[14px] font-semibold text-accent-ink"
          onClick={() => setOpen(true)}
        >
          Modifier le rôle
        </button>
        <ChangeRoleModal {...args} open={open} onOpenChange={setOpen} />
      </div>
    )
  },
}
