import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { LockMemberModal, type LockMemberModalProps } from './LockMemberModal'

const meta: Meta<typeof LockMemberModal> = {
  title: 'Organisms/LockMemberModal',
  component: LockMemberModal,
  tags: ['autodocs'],
  args: { open: true, memberName: 'Inès BAMBA', onConfirm: fn(), onOpenChange: fn() },
}
export default meta
type Story = StoryObj<typeof LockMemberModal>

export const Lock: Story = {
  args: { mode: 'lock' },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByRole('dialog')).toBeInTheDocument()
    await expect(body.getByText("Bloquer l'accès de Inès BAMBA ?")).toBeInTheDocument()
    await expect(body.getByRole('button', { name: "Bloquer l'accès" })).toBeInTheDocument()
  },
}

export const Unlock: Story = {
  args: { mode: 'unlock' },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByText("Débloquer l'accès de Inès BAMBA ?")).toBeInTheDocument()
    await expect(body.getByRole('button', { name: 'Débloquer' })).toBeInTheDocument()
    // Pas de sélecteur de raison en mode unlock
    await expect(body.queryByText('Raison (optionnel)')).not.toBeInTheDocument()
  },
}

export const LockReasonAutre: Story = {
  args: { mode: 'lock' },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    // Ouvre le Select, choisit « Autre » au clavier → révèle le champ libre
    await userEvent.click(body.getByRole('combobox', { name: 'Raison (optionnel)' }))
    await userEvent.click(await body.findByRole('option', { name: 'Autre' }))
    await expect(
      body.getByRole('textbox', { name: 'Préciser la raison du blocage' })
    ).toBeInTheDocument()
  },
}

/** Démo contrôlée : ouvre la modale via un bouton (état réel open/onOpenChange). */
export const Controlled: Story = {
  render: (args: LockMemberModalProps) => {
    const [open, setOpen] = React.useState(false)
    return (
      <div className="p-6">
        <button
          type="button"
          className="rounded-md bg-data-negative px-4 py-2 text-[14px] font-semibold text-white"
          onClick={() => setOpen(true)}
        >
          Bloquer l'accès
        </button>
        <LockMemberModal {...args} open={open} onOpenChange={setOpen} />
      </div>
    )
  },
}
