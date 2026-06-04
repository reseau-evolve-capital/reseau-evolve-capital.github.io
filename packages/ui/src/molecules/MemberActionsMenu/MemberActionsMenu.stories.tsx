import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { MemberActionsMenu } from './MemberActionsMenu'

const meta: Meta<typeof MemberActionsMenu> = {
  title: 'Molecules/MemberActionsMenu',
  component: MemberActionsMenu,
  tags: ['autodocs'],
  args: { accessStatus: 'active', onLock: fn(), onUnlock: fn(), onViewProfile: fn() },
  decorators: [
    (Story) => (
      <div className="flex justify-end p-6 bg-bg-page">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof MemberActionsMenu>

export const Active: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement.ownerDocument.body)
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Actions' }))
    const lock = await canvas.findByRole('menuitem', { name: /Bloquer l'accès/i })
    await expect(canvas.getByRole('menuitem', { name: /Voir la fiche/i })).toBeInTheDocument()
    await userEvent.click(lock)
    await waitFor(() => expect(args.onLock).toHaveBeenCalledTimes(1))
  },
}

export const Locked: Story = {
  args: { accessStatus: 'locked' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement.ownerDocument.body)
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Actions' }))
    const unlock = await canvas.findByRole('menuitem', { name: /Débloquer/i })
    await userEvent.click(unlock)
    await waitFor(() => expect(args.onUnlock).toHaveBeenCalledTimes(1))
  },
}
