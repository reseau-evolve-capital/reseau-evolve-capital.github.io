import type { Meta, StoryObj } from '@storybook/react'
import { InvitationStatusBadge } from './InvitationStatusBadge'

const meta: Meta<typeof InvitationStatusBadge> = {
  title: 'Atoms/InvitationStatusBadge',
  component: InvitationStatusBadge,
  tags: ['autodocs'],
  args: { status: 'pending' },
}
export default meta
type Story = StoryObj<typeof InvitationStatusBadge>

export const Pending: Story = { args: { status: 'pending' } }
export const Accepted: Story = { args: { status: 'accepted' } }
export const Expired: Story = { args: { status: 'expired' } }
export const Revoked: Story = { args: { status: 'revoked' } }

export const AllStatuts: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 16 }}>
      <InvitationStatusBadge status="pending" />
      <InvitationStatusBadge status="accepted" />
      <InvitationStatusBadge status="expired" />
      <InvitationStatusBadge status="revoked" />
    </div>
  ),
}
