import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'
import { DashboardHero } from './DashboardHero'

const meta: Meta<typeof DashboardHero> = {
  title: 'Organisms/DashboardHero',
  component: DashboardHero,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-md p-4 bg-bg-page min-h-screen">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof DashboardHero>

/** Cas V0 : valeur nette seule, sans variation ni sparkline */
export const Default: Story = {
  args: {
    netMarketValue: 64_320.5,
    syncedAt: new Date(Date.now() - 35 * 60 * 1000),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const label = canvas.getByText('Ta valorisation nette')
    expect(label).toBeTruthy()
  },
}

/** Avec TrendBadge (V1+) */
export const WithVariation: Story = {
  args: {
    netMarketValue: 64_320.5,
    syncedAt: new Date(Date.now() - 35 * 60 * 1000),
    variation: {
      direction: 'up',
      value: '+1,2 %',
      subValue: '+773 €',
    },
  },
}

/** Avec sparkline (V1+) — décorateur dimensionné pour ResponsiveContainer */
export const WithSparkline: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 360, padding: 16, background: 'var(--color-bg-page)' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    netMarketValue: 64_320.5,
    syncedAt: new Date(Date.now() - 35 * 60 * 1000),
    historicalData: Array.from({ length: 30 }, (_, i) => 58_000 + i * 250 + Math.sin(i) * 500),
  },
}

/** Squelette de chargement */
export const Loading: Story = {
  args: {
    netMarketValue: 0,
    isLoading: true,
  },
}

/** Variante cliquable — tap ouvre le détail (wired in T11) */
export const Clickable: Story = {
  args: {
    netMarketValue: 64_320.5,
    syncedAt: new Date(Date.now() - 35 * 60 * 1000),
    onClick: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button')
    await userEvent.click(button)
    expect(args.onClick).toHaveBeenCalledTimes(1)
  },
}
