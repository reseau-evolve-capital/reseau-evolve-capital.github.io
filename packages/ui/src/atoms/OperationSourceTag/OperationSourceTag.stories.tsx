import type { Meta, StoryObj } from '@storybook/react'
import { expect, within } from 'storybook/test'
import { OperationSourceTag } from './OperationSourceTag'
import { withDarkTheme } from '../../test/darkDecorator'

const meta: Meta<typeof OperationSourceTag> = {
  title: 'Atoms/OperationSourceTag',
  component: OperationSourceTag,
  tags: ['autodocs'],
  args: { variant: 'manual' },
}
export default meta
type Story = StoryObj<typeof OperationSourceTag>

export const Manual: Story = {
  args: { variant: 'manual' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByText('Manuel')).toBeTruthy()
  },
}

export const Migrated: Story = {
  args: { variant: 'migrated' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByText('Migré')).toBeTruthy()
  },
}

const Panel = () => (
  <div style={{ background: 'var(--bg)', padding: 24, display: 'flex', gap: 16 }}>
    <OperationSourceTag variant="manual" />
    <OperationSourceTag variant="migrated" />
  </div>
)

/** Clair. */
export const AllVariants: Story = { render: () => <Panel /> }

/** Sombre. */
export const AllVariantsDark: Story = {
  decorators: [withDarkTheme],
  render: () => <Panel />,
}
