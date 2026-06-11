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
    const label = canvas.getByText('Ta quote-part')
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

/** Hero V2 « open » mobile — sans carte, montant display 58px, méta + action. */
export const OpenMobile: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 375, padding: 16, background: 'var(--color-bg-page)' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    netMarketValue: 64_320.5,
    appearance: 'open',
    variation: { direction: 'up', value: '+1,2 %', subValue: '+773 €' },
    variationMeta: 'hier · 10.06',
    action: (
      <a href="#" className="text-[13px] font-semibold text-text-sec underline underline-offset-2">
        Comprendre ma quote-part
      </a>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByText('hier · 10.06')).toBeInTheDocument()
    expect(canvas.getByRole('link', { name: 'Comprendre ma quote-part' })).toBeInTheDocument()
    expect(canvas.getByText('Ta quote-part')).toBeInTheDocument()
  },
}

/** Hero V2 « open » desktop — montant 88px (md+), variation + méta + action. */
export const OpenDesktop: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 760, padding: 24, background: 'var(--color-bg-page)' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    netMarketValue: 133_655,
    appearance: 'open',
    syncedAt: new Date(Date.now() - 35 * 60 * 1000),
    variation: { direction: 'up', value: '+4,55 %', subValue: '+2 854 €' },
    variationMeta: 'hier · 10.06',
    action: (
      <a href="#" className="text-[13px] font-semibold text-text-sec underline underline-offset-2">
        Comprendre ma quote-part
      </a>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByText('Ta quote-part')).toBeInTheDocument()
    expect(canvas.getByText('+4,55 %')).toBeInTheDocument()
  },
}
