import type { Meta, StoryObj } from '@storybook/react'
import { SegmentedProgress } from './SegmentedProgress'

const meta: Meta<typeof SegmentedProgress> = {
  title: 'Molecules/SegmentedProgress',
  component: SegmentedProgress,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div style={{ width: 480, maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof SegmentedProgress>

export const Etape1: Story = {
  args: { step: 1, total: 3, label: 'Étape 1 sur 3' },
}

export const Etape2: Story = {
  args: { step: 2, total: 3, label: 'Étape 2 sur 3' },
}

export const Etape3: Story = {
  args: { step: 3, total: 3, label: 'Étape 3 sur 3' },
}
