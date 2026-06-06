import type { Meta, StoryObj } from '@storybook/react'
import { ProgressHeader } from './ProgressHeader'

const meta: Meta<typeof ProgressHeader> = {
  title: 'Molecules/ProgressHeader',
  component: ProgressHeader,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof ProgressHeader>

export const Etape1: Story = {
  args: { step: 1, total: 3 },
}

export const Etape2: Story = {
  args: { step: 2, total: 3 },
}

export const Etape3: Story = {
  args: { step: 3, total: 3 },
}
