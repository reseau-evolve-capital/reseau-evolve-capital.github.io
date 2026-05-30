import type { Meta, StoryObj } from '@storybook/react'
import { NumberStat } from './NumberStat'

const meta: Meta<typeof NumberStat> = {
  title: 'Molecules/NumberStat',
  component: NumberStat,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof NumberStat>

export const Default: Story = {
  args: {
    value: 65574.87,
    label: 'Quote-part estimée',
    trend: { direction: 'up', value: '+1,2 %' },
  },
}

export const NegativeTrend: Story = {
  args: {
    value: 12450,
    label: 'Cotisations versées',
    trend: { direction: 'down', value: '-5,2 %' },
  },
}

export const NoTrend: Story = {
  args: {
    value: 4800,
    label: 'Montant investi',
  },
}

export const Flat: Story = {
  args: {
    value: 32000,
    label: 'Valeur liquidative',
    trend: { direction: 'flat', value: '0,0 %' },
  },
}
