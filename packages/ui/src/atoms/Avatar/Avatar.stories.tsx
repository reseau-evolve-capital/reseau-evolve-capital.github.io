import type { Meta, StoryObj } from '@storybook/react'
import { Avatar } from './Avatar'

const meta: Meta<typeof Avatar> = {
  title: 'Atoms/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  args: { name: 'Alice Courbet' },
}
export default meta
type Story = StoryObj<typeof Avatar>

export const Small: Story = { args: { name: 'Alice Courbet', size: 'sm' } }
export const Medium: Story = { args: { name: 'Marc Leduc', size: 'md' } }
export const Large: Story = { args: { name: 'Sophie Renard', size: 'lg' } }

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 16 }}>
      <Avatar name="Alice Courbet" size="sm" />
      <Avatar name="Marc Leduc" size="md" />
      <Avatar name="Sophie Renard" size="lg" />
    </div>
  ),
}

export const DarkMode: Story = {
  parameters: { globals: { theme: 'dark' } },
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 16 }}>
      <Avatar name="Alice Courbet" size="sm" />
      <Avatar name="Marc Leduc" size="md" />
      <Avatar name="Sophie Renard" size="lg" />
    </div>
  ),
}
