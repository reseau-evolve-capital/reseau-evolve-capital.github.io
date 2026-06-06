import type { Meta, StoryObj } from '@storybook/react'
import { AccessBadge } from './AccessBadge'

const meta: Meta<typeof AccessBadge> = {
  title: 'Atoms/AccessBadge',
  component: AccessBadge,
  tags: ['autodocs'],
  args: { status: 'active' },
}
export default meta
type Story = StoryObj<typeof AccessBadge>

export const Active: Story = { args: { status: 'active' } }
export const Locked: Story = { args: { status: 'locked' } }
export const Invited: Story = { args: { status: 'invited' } }

export const AllStatuts: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: 16 }}>
      <AccessBadge status="active" />
      <AccessBadge status="locked" />
      <AccessBadge status="invited" />
    </div>
  ),
}
