import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { InvitationsTable, type InvitationRow } from './InvitationsTable'

const INVITATIONS: InvitationRow[] = [
  {
    id: '1',
    email: 'nouveau@exemple.fr',
    sentAt: '3 juin 2026',
    expiresAt: '6 juin 2026',
    status: 'pending',
  },
  {
    id: '2',
    email: 'marc.dupont@gmail.com',
    sentAt: '28 mai 2026',
    expiresAt: '31 mai 2026',
    status: 'accepted',
  },
  {
    id: '3',
    email: 'sophie.martin@proton.me',
    sentAt: '20 mai 2026',
    expiresAt: '23 mai 2026',
    status: 'expired',
  },
  {
    id: '4',
    email: 'ancien@exemple.fr',
    sentAt: '12 mai 2026',
    expiresAt: '15 mai 2026',
    status: 'revoked',
  },
]

const meta: Meta<typeof InvitationsTable> = {
  title: 'Organisms/InvitationsTable',
  component: InvitationsTable,
  tags: ['autodocs'],
  args: { invitations: INVITATIONS, onResend: fn(), onRevoke: fn() },
  decorators: [
    (Story) => (
      <div className="p-6 bg-bg-page min-h-screen">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof InvitationsTable>

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getAllByTestId('invitation-row')).toHaveLength(4)

    // pending : Renvoyer actif → clic remonte l'id
    await userEvent.click(
      canvas.getByRole('button', { name: /Renvoyer l'invitation à nouveau@exemple\.fr/i })
    )
    await expect(args.onResend).toHaveBeenCalledWith('1')

    // accepted : Révoquer désactivé
    await expect(
      canvas.getByRole('button', { name: /Révoquer l'invitation de marc\.dupont@gmail\.com/i })
    ).toBeDisabled()
  },
}

export const Empty: Story = {
  args: { invitations: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Aucune invitation.')).toBeInTheDocument()
  },
}

export const Loading: Story = {
  args: { invitations: [], isLoading: true },
}
