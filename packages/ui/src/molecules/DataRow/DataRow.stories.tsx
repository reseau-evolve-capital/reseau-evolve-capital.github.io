import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import type { PortfolioPosition } from '@evolve/types'
import { DataRow } from './DataRow'
import { InfoTip } from '../../atoms/InfoTip'

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

/**
 * Slot `perfInfo` rempli — InfoTip d'aide près de la valeur de perf (gain/perte depuis l'achat).
 * Rendu en FRÈRE du bouton cliquable de la carte (jamais à l'intérieur — un interactif imbriqué
 * dans un <button> est invalide en a11y) : tap sur la carte = détail, tap sur le (i) = aide.
 */
export const WithPerfInfo: Story = {
  args: {
    position: base,
    onClick: fn(),
    perfInfo: (
      <InfoTip
        content="Performance de cette ligne depuis l'achat — à ne pas confondre avec la variation du jour."
        aria-label="En savoir plus sur la performance depuis l'achat"
      />
    ),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    // Le (i) n'est PAS imbriqué dans le bouton de la carte : son clic n'ouvre pas le détail.
    const info = canvas.getByRole('button', {
      name: "En savoir plus sur la performance depuis l'achat",
    })
    await userEvent.click(info)
    await expect(
      canvas.getByText(
        "Performance de cette ligne depuis l'achat — à ne pas confondre avec la variation du jour."
      )
    ).toBeInTheDocument()
    await expect(args.onClick).not.toHaveBeenCalled()
  },
}

export const Loading: Story = { args: { position: base, isLoading: true } }
