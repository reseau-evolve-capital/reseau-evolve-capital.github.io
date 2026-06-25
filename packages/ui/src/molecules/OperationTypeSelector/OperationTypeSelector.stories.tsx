import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { OperationTypeSelector, OperationTypeCard } from './OperationTypeSelector'
import { withDarkTheme } from '../../test/darkDecorator'

const meta: Meta<typeof OperationTypeSelector> = {
  title: 'Molecules/OperationTypeSelector',
  component: OperationTypeSelector,
  tags: ['autodocs'],
  args: { onSelect: fn() },
}
export default meta
type Story = StoryObj<typeof OperationTypeSelector>

export const Grid: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement)
    const cards = c.getAllByRole('button')
    await expect(cards).toHaveLength(6)
    await userEvent.click(c.getByText('Cotisation'))
    await expect(args.onSelect).toHaveBeenCalledWith('contribution')
  },
}

export const English: Story = {
  args: {
    copy: {
      contribution: { label: 'Contribution', description: 'A member payment' },
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByText('Contribution')).toBeTruthy()
  },
}

export const SingleCard: StoryObj<typeof OperationTypeCard> = {
  render: () => <OperationTypeCard type="dividend_cash" onSelect={fn()} />,
}

export const Dark: Story = { decorators: [withDarkTheme] }
