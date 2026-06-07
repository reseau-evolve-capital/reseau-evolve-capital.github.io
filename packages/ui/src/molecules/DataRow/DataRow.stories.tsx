import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import type { PortfolioPosition } from '@evolve/types'
import { DataRow } from './DataRow'

const base: PortfolioPosition = {
  id: '1',
  name: 'META PLATFORMS',
  symbol: 'NASDAQ:META',
  category: 'Actions',
  sector: 'Technologie',
  typologie: 'Offensif',
  quantity: 248,
  pru: 450,
  livePrice: 585,
  marketPrice: 585,
  currentValue: 145050,
  gainLossEur: 31834,
  gainLossPct: 0.28,
  allocationPct: 0.12,
  isLive: true,
}

const meta: Meta<typeof DataRow> = {
  title: 'Molecules/DataRow',
  component: DataRow,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-md p-4 bg-bg-page">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof DataRow>

export const Gain: Story = {
  args: { position: base, onClick: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button'))
    await expect(args.onClick).toHaveBeenCalled()
  },
}

export const Perte: Story = {
  args: { position: { ...base, name: 'EXEMPLE PERTE', gainLossPct: -0.08, gainLossEur: -1200 } },
}

export const SansCoursLive: Story = {
  args: { position: { ...base, livePrice: null, isLive: false } },
}

export const Loading: Story = { args: { position: base, isLoading: true } }
