import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { InviteForm } from './InviteForm'

const meta: Meta<typeof InviteForm> = {
  title: 'Molecules/InviteForm',
  component: InviteForm,
  tags: ['autodocs'],
  args: { onSubmit: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-xl p-6 bg-bg-page">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof InviteForm>

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText(/inviter/i)
    await userEvent.type(input, 'nouveau@exemple.fr')
    await userEvent.click(canvas.getByRole('button', { name: /Envoyer/i }))
    await expect(args.onSubmit).toHaveBeenCalledWith('nouveau@exemple.fr')
  },
}

export const InvalidEmail: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText(/inviter/i)
    await userEvent.type(input, 'pas-un-email')
    await userEvent.click(canvas.getByRole('button', { name: /Envoyer/i }))
    // Validation locale : onSubmit jamais appelé, message d'erreur affiché
    await expect(args.onSubmit).not.toHaveBeenCalled()
    await expect(canvas.getByRole('alert')).toBeInTheDocument()
  },
}

export const Pending: Story = {
  args: { isPending: true },
}

export const ServerError: Story = {
  args: { error: 'Cette adresse a déjà été invitée.' },
}
