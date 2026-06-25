import type { Meta, StoryObj } from '@storybook/react'
import { expect, within } from 'storybook/test'
import { OperationStatusTag } from './OperationStatusTag'
import { withDarkTheme } from '../../test/darkDecorator'

const meta: Meta<typeof OperationStatusTag> = {
  title: 'Atoms/OperationStatusTag',
  component: OperationStatusTag,
  tags: ['autodocs'],
  args: { variant: 'settled' },
}
export default meta
type Story = StoryObj<typeof OperationStatusTag>

export const Settled: Story = {
  args: { variant: 'settled' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByText('Settlée')).toBeTruthy()
  },
}

export const Cancelled: Story = {
  args: { variant: 'cancelled' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByText('Annulée')).toBeTruthy()
  },
}

const Panel = () => (
  <div style={{ background: 'var(--bg)', padding: 24, display: 'flex', gap: 12 }}>
    <OperationStatusTag variant="settled" />
    <OperationStatusTag variant="cancelled" />
  </div>
)

/** Clair. */
export const AllVariants: Story = { render: () => <Panel /> }

/** Sombre — la pastille Settlée bascule en jaune de marque (piège `.op-chip-div`). */
export const AllVariantsDark: Story = {
  decorators: [withDarkTheme],
  render: () => <Panel />,
}
