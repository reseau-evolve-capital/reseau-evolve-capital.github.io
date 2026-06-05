import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { SensitiveConfirmModal } from './SensitiveConfirmModal'

const meta: Meta<typeof SensitiveConfirmModal> = {
  title: 'Organisms/SensitiveConfirmModal',
  component: SensitiveConfirmModal,
  tags: ['autodocs'],
  args: {
    open: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    title: 'Opération sensible',
    description:
      "Vous modifiez l'identifiant du club chez le courtier. Une valeur erronée peut empêcher le rapprochement des comptes.",
    acknowledgeLabel: "J'ai vérifié l'identifiant et je confirme vouloir le modifier.",
  },
}
export default meta
type Story = StoryObj<typeof SensitiveConfirmModal>

export const Default: Story = {
  args: {
    changes: [
      { label: 'Identifiant du club chez le courtier', before: 'BRK-1029', after: 'BRK-2048' },
    ],
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByRole('dialog')).toBeInTheDocument()
    await expect(body.getByText('Opération sensible')).toBeInTheDocument()
    // Le bouton de confirmation est désactivé tant que la case n'est pas cochée (double-confirm).
    await expect(body.getByRole('button', { name: 'Confirmer' })).toBeDisabled()
  },
}

/** Parcours double-confirmation : cocher la case active le bouton, puis confirmer. */
export const DoubleConfirm: Story = {
  args: {
    changes: [
      { label: 'Identifiant du club chez le courtier', before: 'BRK-1029', after: 'BRK-2048' },
    ],
  },
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body)
    const confirm = body.getByRole('button', { name: 'Confirmer' })
    await expect(confirm).toBeDisabled()
    await userEvent.click(body.getByRole('checkbox'))
    await expect(confirm).toBeEnabled()
    await userEvent.click(confirm)
    await expect(args.onConfirm).toHaveBeenCalledTimes(1)
  },
}
