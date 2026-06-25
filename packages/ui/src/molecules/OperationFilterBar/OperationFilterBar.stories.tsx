import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { OperationFilterBar } from './OperationFilterBar'
import { withDarkTheme } from '../../test/darkDecorator'

const filters = [
  { key: 'type', label: 'Type', value: 'Tous' },
  { key: 'member', label: 'Membre', value: 'Tous' },
  { key: 'period', label: 'Période', value: '6 derniers mois' },
]

const meta: Meta<typeof OperationFilterBar> = {
  title: 'Molecules/OperationFilterBar',
  component: OperationFilterBar,
  tags: ['autodocs'],
  args: { filters, onFilterClick: fn() },
  decorators: [
    (Story) => (
      <div style={{ background: 'var(--card)', width: 720, maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof OperationFilterBar>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Trié par date')).toBeInTheDocument()
    await expect(canvas.getByText('6 derniers mois')).toBeInTheDocument()
  },
}

export const ClicFiltre: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText('Période'))
    await expect(args.onFilterClick).toHaveBeenCalledWith('period')
  },
}

export const Dark: Story = { decorators: [withDarkTheme] }
