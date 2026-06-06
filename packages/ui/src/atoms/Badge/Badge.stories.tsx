import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './Badge'

const meta: Meta<typeof Badge> = {
  title: 'Atoms/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: 'Label' },
}
export default meta
type Story = StoryObj<typeof Badge>

export const Brand: Story = { args: { variant: 'brand', children: 'Brand' } }
export const Neutral: Story = { args: { variant: 'neutral', children: 'Neutral' } }
export const Success: Story = { args: { variant: 'success', children: 'Success' } }
export const Warning: Story = { args: { variant: 'warning', children: 'Warning' } }
export const Error: Story = { args: { variant: 'error', children: 'Erreur' } }

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, padding: 16, flexWrap: 'wrap' }}>
      <Badge variant="brand">Brand</Badge>
      <Badge variant="neutral">Neutral</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Erreur</Badge>
    </div>
  ),
}
