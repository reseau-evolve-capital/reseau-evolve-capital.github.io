import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import type { PortfolioPosition } from '@evolve/types'
import { PortfolioTable } from './PortfolioTable'

const mk = (over: Partial<PortfolioPosition>): PortfolioPosition => ({
  id: '1',
  name: 'META',
  symbol: 'NASDAQ:META',
  category: 'Actions',
  sector: 'Technologie',
  quantity: 248,
  pru: 450,
  livePrice: 585,
  currentValue: 145050,
  gainLossEur: 31834,
  gainLossPct: 0.28,
  allocationPct: 0.12,
  isLive: true,
  ...over,
})

const positions = [
  mk({ id: '1', name: 'META', currentValue: 145050 }),
  mk({ id: '2', name: 'NVIDIA', currentValue: 506577, gainLossPct: 3.03 }),
  mk({
    id: '3',
    name: 'OBLIG X',
    category: 'Obligations',
    currentValue: 12000,
    gainLossPct: -0.04,
    gainLossEur: -500,
  }),
]

const meta: Meta<typeof PortfolioTable> = {
  title: 'Organisms/PortfolioTable',
  component: PortfolioTable,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="p-6 bg-bg-page min-h-screen">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof PortfolioTable>

export const Default: Story = {
  args: { positions, onRowClick: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText('META'))
    await expect(args.onRowClick).toHaveBeenCalled()
  },
}

export const Loading: Story = {
  args: { positions: [], isLoading: true, onRowClick: fn() },
}

export const Empty: Story = {
  args: { positions: [], onRowClick: fn() },
}
