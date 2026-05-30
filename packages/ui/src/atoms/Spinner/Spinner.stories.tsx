import type { Meta, StoryObj } from '@storybook/react'
import { Spinner } from './Spinner'

const meta: Meta<typeof Spinner> = {
  title: 'Atoms/Spinner',
  component: Spinner,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof Spinner>

export const Small: Story = { args: { size: 16 } }
export const Medium: Story = { args: { size: 20 } }
export const Large: Story = { args: { size: 24 } }

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 16 }}>
      <Spinner size={16} aria-label="Chargement petit" />
      <Spinner size={20} aria-label="Chargement moyen" />
      <Spinner size={24} aria-label="Chargement grand" />
    </div>
  ),
}
