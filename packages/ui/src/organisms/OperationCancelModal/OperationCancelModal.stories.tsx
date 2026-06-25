import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { OperationCancelModal } from './OperationCancelModal'
import { withDarkTheme } from '../../test/darkDecorator'

function Harness(props: { onConfirm?: (r: string) => void }) {
  const [open, setOpen] = React.useState(true)
  return (
    <div style={{ minHeight: 500, background: 'var(--bg)' }}>
      <OperationCancelModal
        open={open}
        onOpenChange={setOpen}
        operationLabel="NASDAQ:NVDA"
        amount={-24800}
        onConfirm={props.onConfirm ?? fn()}
      />
    </div>
  )
}

const meta: Meta<typeof OperationCancelModal> = {
  title: 'Organisms/OperationCancelModal',
  component: OperationCancelModal,
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof OperationCancelModal>

export const Default: Story = {
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const body = canvasElement.ownerDocument.body
    await waitFor(() => expect(within(body).getByRole('dialog')).toBeInTheDocument())
    await expect(within(body).getByText('Annuler cette opération ?')).toBeInTheDocument()
    // Confirmer désactivé tant que motif vide.
    await expect(
      within(body).getByRole('button', { name: "Confirmer l'annulation" })
    ).toBeDisabled()
  },
}

export const MotifActiveConfirmation: Story = {
  render: (args) => <Harness onConfirm={args.onConfirm} />,
  args: { onConfirm: fn() },
  play: async ({ canvasElement, args }) => {
    const body = canvasElement.ownerDocument.body
    await waitFor(() => expect(within(body).getByRole('dialog')).toBeInTheDocument())
    const confirm = within(body).getByRole('button', { name: "Confirmer l'annulation" })
    await expect(confirm).toBeDisabled()
    await userEvent.type(within(body).getByRole('textbox'), 'Doublon de saisie')
    await expect(confirm).toBeEnabled()
    await userEvent.click(confirm)
    await expect(args.onConfirm).toHaveBeenCalledWith('Doublon de saisie')
  },
}

export const BlancNeConfirmePas: Story = {
  render: (args) => <Harness onConfirm={args.onConfirm} />,
  args: { onConfirm: fn() },
  play: async ({ canvasElement, args }) => {
    const body = canvasElement.ownerDocument.body
    await waitFor(() => expect(within(body).getByRole('dialog')).toBeInTheDocument())
    await userEvent.type(within(body).getByRole('textbox'), '   ')
    await expect(
      within(body).getByRole('button', { name: "Confirmer l'annulation" })
    ).toBeDisabled()
    await expect(args.onConfirm).not.toHaveBeenCalled()
  },
}

export const Dark: Story = { decorators: [withDarkTheme], render: () => <Harness /> }
