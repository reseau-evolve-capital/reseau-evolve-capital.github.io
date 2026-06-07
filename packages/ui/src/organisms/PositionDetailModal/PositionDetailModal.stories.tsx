import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within, waitFor } from 'storybook/test'
import type { PortfolioPosition } from '@evolve/types'

import { PositionDetailModal } from './PositionDetailModal'

const posGain: PortfolioPosition = {
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

const posLoss: PortfolioPosition = {
  id: '2',
  name: 'TESLA INC',
  symbol: 'NASDAQ:TSLA',
  category: 'Actions',
  sector: 'Automobile',
  typologie: 'Défensif',
  quantity: 10,
  pru: 280,
  livePrice: 195,
  marketPrice: 195,
  currentValue: 1950,
  gainLossEur: -850,
  gainLossPct: -0.3036,
  allocationPct: 0.04,
  isLive: true,
}

const meta: Meta<typeof PositionDetailModal> = {
  title: 'Organisms/PositionDetailModal',
  component: PositionDetailModal,
  parameters: {
    layout: 'fullscreen',
  },
}
export default meta
type Story = StoryObj<typeof PositionDetailModal>

/** Modale ouverte sur une position en gain — Escape la ferme. */
export const Ouverte: Story = {
  render: (args) => {
    const [open, setOpen] = React.useState(true)
    return <PositionDetailModal {...args} position={posGain} open={open} onOpenChange={setOpen} />
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await waitFor(() => expect(body.getByRole('dialog')).toBeInTheDocument())
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(body.queryByRole('dialog')).not.toBeInTheDocument())
  },
}

/** Perte : les couleurs +/- € et +/- % utilisent `text-data-negative`, jamais le rouge brand.
 *  Vérification unitaire dans PositionDetailModal.test.tsx (test "perte : classe data-negative"). */
export const Perte: Story = {
  render: () => {
    const [open, setOpen] = React.useState(true)
    return <PositionDetailModal position={posLoss} open={open} onOpenChange={setOpen} />
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await waitFor(() => expect(body.getByRole('dialog')).toBeInTheDocument())
  },
}

/** Cours non disponible : la valeur affiche "—". */
export const CoursIndisponible: Story = {
  render: () => {
    const [open, setOpen] = React.useState(true)
    return (
      <PositionDetailModal
        position={{ ...posGain, livePrice: null, isLive: false }}
        open={open}
        onOpenChange={setOpen}
      />
    )
  },
}
