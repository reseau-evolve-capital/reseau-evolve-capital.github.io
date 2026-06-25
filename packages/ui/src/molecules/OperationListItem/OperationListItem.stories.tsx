import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { OperationListItem, type OperationListItemData } from './OperationListItem'
import { withDarkTheme } from '../../test/darkDecorator'

const base: OperationListItemData = {
  id: 'OP-318',
  type: 'contribution',
  label: 'Éric Lambert',
  meta: 'Cotisation de juin',
  date: '2026-06-18',
  amount: 300,
  status: 'ok',
}

const meta: Meta<typeof OperationListItem> = {
  title: 'Molecules/OperationListItem',
  component: OperationListItem,
  tags: ['autodocs'],
  args: { operation: base, onSelect: fn() },
  decorators: [
    (Story) => (
      <div style={{ background: 'var(--card)', width: 720, maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof OperationListItem>

export const Cotisation: Story = {}

export const Achat: Story = {
  args: {
    operation: {
      id: 'OP-310',
      type: 'buy',
      label: 'NASDAQ:NVDA',
      meta: '160 titres @ 155 €',
      date: '2026-06-10',
      amount: -24800,
      status: 'ok',
    },
  },
}

export const Settled: Story = {
  args: {
    operation: {
      id: 'OP-298',
      type: 'contribution',
      label: 'Sofia Rossi',
      meta: 'Cotisation de mai · 150 parts',
      date: '2026-05-16',
      amount: 300,
      status: 'settled',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Settlée')).toBeInTheDocument()
  },
}

export const Cancelled: Story = {
  args: {
    operation: {
      id: 'OP-241',
      type: 'contribution',
      label: 'Éric Lambert',
      meta: "Cotisation d'avril",
      date: '2026-04-18',
      amount: 300,
      status: 'cancelled',
    },
  },
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector('[role="button"]') as HTMLElement
    await expect(row.className).toContain('opacity-60')
    const label = within(canvasElement).getByText('Éric Lambert')
    await expect(label.className).toContain('line-through')
  },
}

export const ClickOuvreDetail: Story = {
  play: async ({ canvasElement, args }) => {
    const row = canvasElement.querySelector('[role="button"]') as HTMLElement
    await userEvent.click(row)
    await expect(args.onSelect).toHaveBeenCalledWith('OP-318')
  },
}

export const ClavierEnter: Story = {
  play: async ({ canvasElement, args }) => {
    const row = canvasElement.querySelector('[role="button"]') as HTMLElement
    row.focus()
    await userEvent.keyboard('{Enter}')
    await expect(args.onSelect).toHaveBeenCalledWith('OP-318')
  },
}

export const DateInvalideFallback: Story = {
  args: { operation: { ...base, date: null } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/—/)).toBeInTheDocument()
  },
}

export const Dark: Story = {
  decorators: [withDarkTheme],
  args: {
    operation: {
      id: 'OP-316',
      type: 'dividend_cash',
      label: 'Sanofi',
      meta: 'Dividende en espèces',
      date: '2026-06-16',
      amount: 1240,
      status: 'settled',
    },
  },
}
