import type { Meta, StoryObj } from '@storybook/react'
import { TrendBadge } from './TrendBadge'

const meta: Meta<typeof TrendBadge> = {
  title: 'Molecules/TrendBadge',
  component: TrendBadge,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof TrendBadge>

export const Up: Story = {
  args: { direction: 'up', value: '+1,2 %', subValue: '+773 €' },
}

export const Down: Story = {
  args: { direction: 'down', value: '-5,2 %', subValue: '-3 214 €' },
}

export const Flat: Story = {
  args: { direction: 'flat', value: '0,0 %' },
}

export const Warn: Story = {
  args: { direction: 'warn', value: 'Cotisation en retard' },
}

export const AllDirections: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 16 }}>
      <TrendBadge direction="up" value="+1,2 %" subValue="+773 €" />
      <TrendBadge direction="down" value="-5,2 %" subValue="-3 214 €" />
      <TrendBadge direction="flat" value="0,0 %" />
      <TrendBadge direction="warn" value="Impayé" />
    </div>
  ),
}
