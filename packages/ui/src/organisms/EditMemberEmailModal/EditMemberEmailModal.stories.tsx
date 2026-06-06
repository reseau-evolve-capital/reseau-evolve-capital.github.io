import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { EditMemberEmailModal, type EditMemberEmailModalProps } from './EditMemberEmailModal'

const meta: Meta<typeof EditMemberEmailModal> = {
  title: 'Organisms/EditMemberEmailModal',
  component: EditMemberEmailModal,
  tags: ['autodocs'],
  args: { open: true, memberName: 'Inès BAMBA', onConfirm: fn(), onOpenChange: fn() },
}
export default meta
type Story = StoryObj<typeof EditMemberEmailModal>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByRole('dialog')).toBeInTheDocument()
    await expect(body.getByText("Renseigner l'email de Inès BAMBA")).toBeInTheDocument()
    // CTA désactivé tant que le champ est vide
    await expect(body.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  },
}

export const TypeAndSubmit: Story = {
  play: async ({ args, canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.type(body.getByLabelText('Adresse email'), 'ines.bamba@exemple.fr')
    await userEvent.click(body.getByRole('button', { name: 'Enregistrer' }))
    await expect(args.onConfirm).toHaveBeenCalledWith('ines.bamba@exemple.fr')
  },
}

export const WithError: Story = {
  args: { error: 'Cet email est déjà utilisé par un autre membre.' },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByRole('alert')).toHaveTextContent('Cet email est déjà utilisé')
  },
}

/** Démo contrôlée : ouvre la modale via un bouton (état réel open/onOpenChange). */
export const Controlled: Story = {
  render: (args: EditMemberEmailModalProps) => {
    const [open, setOpen] = React.useState(false)
    return (
      <div className="p-6">
        <button
          type="button"
          className="rounded-md bg-card-sub px-4 py-2 text-[14px] font-semibold text-text"
          onClick={() => setOpen(true)}
        >
          Renseigner l'email
        </button>
        <EditMemberEmailModal {...args} open={open} onOpenChange={setOpen} />
      </div>
    )
  },
}
