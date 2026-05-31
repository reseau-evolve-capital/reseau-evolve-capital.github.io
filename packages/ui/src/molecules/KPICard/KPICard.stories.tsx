import type { Meta, StoryObj } from '@storybook/react'
import { KPICard } from './KPICard'

const meta: Meta<typeof KPICard> = {
  title: 'Molecules/KPICard',
  component: KPICard,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof KPICard>

export const Default: Story = {
  args: {
    title: 'Quote-part estimée',
    value: 65574.87,
    trend: { direction: 'up', value: '+1,2 %', subValue: '+773 €' },
    href: '/portfolio',
  },
}

export const NegativeTrend: Story = {
  args: {
    title: 'Performance mensuelle',
    value: 12450.0,
    trend: { direction: 'down', value: '-2,3 %', subValue: '-290 €' },
  },
}

export const NoTrend: Story = {
  args: {
    title: 'Cotisations versées',
    value: 4800.0,
  },
}

export const WithIcon: Story = {
  args: {
    title: 'Portefeuille',
    value: 65574.87,
    icon: 'TrendingUp',
    trend: { direction: 'up', value: '+1,2 %' },
    href: '/portfolio',
  },
}

export const LightAndDark: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16 }}>
      <KPICard
        title="Quote-part"
        value={65574.87}
        trend={{ direction: 'up', value: '+1,2 %' }}
        href="#"
      />
      <div
        data-theme="dark"
        style={{ padding: 12, background: 'var(--color-bg, #0a0a0a)', borderRadius: 10 }}
      >
        <KPICard
          title="Quote-part"
          value={65574.87}
          trend={{ direction: 'down', value: '-2,3 %' }}
          href="#"
        />
      </div>
    </div>
  ),
}
