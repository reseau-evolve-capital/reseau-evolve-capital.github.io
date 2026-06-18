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

/**
 * Triple-confirmation (NET-007 — changement de matrice) : case cochée + RESAISIE exacte d'un
 * texte (ex. le slug du club) avant que le bouton ne s'active.
 */
export const WithConfirmationText: Story = {
  args: {
    title: 'Changer la matrice de Evolve ?',
    description:
      'La synchronisation repartira de la nouvelle feuille. Action sensible, journalisée.',
    acknowledgeLabel:
      "J'ai vérifié que la nouvelle feuille est partagée et structurée correctement.",
    confirmationText: 'evolve',
    confirmationLabel: 'Tape evolve pour confirmer',
    confirmLabel: 'Changer la matrice',
    changes: [{ label: 'ID de la feuille', before: '…3JkLpM0', after: '…9XbTq72' }],
  },
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body)
    const confirm = body.getByRole('button', { name: 'Changer la matrice' })
    await userEvent.click(body.getByRole('checkbox'))
    // Case cochée mais resaisie absente → toujours désactivé.
    await expect(confirm).toBeDisabled()
    await userEvent.type(body.getByRole('textbox'), 'evolve')
    await expect(confirm).toBeEnabled()
    await userEvent.click(confirm)
    await expect(args.onConfirm).toHaveBeenCalledTimes(1)
  },
}
