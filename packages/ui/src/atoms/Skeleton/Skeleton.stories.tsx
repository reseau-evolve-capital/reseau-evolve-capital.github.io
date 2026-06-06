import type { Meta, StoryObj } from '@storybook/react'
import { Skeleton } from './Skeleton'

const meta: Meta<typeof Skeleton> = {
  title: 'Atoms/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof Skeleton>

export const Line: Story = { args: { height: 16, width: '100%' } }
export const Card: Story = { args: { height: 120, width: 200 } }
export const Circle: Story = { args: { height: 36, width: 36, radius: '50%' } }

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
      <Skeleton height={16} width="100%" />
      <Skeleton height={12} width="75%" />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Skeleton height={36} width={36} radius="50%" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          <Skeleton height={14} width="60%" />
          <Skeleton height={12} width="40%" />
        </div>
      </div>
      <Skeleton height={120} width={200} />
    </div>
  ),
}
