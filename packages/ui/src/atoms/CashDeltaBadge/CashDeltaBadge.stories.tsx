import type { Meta, StoryObj } from '@storybook/react'
import { expect, within } from 'storybook/test'
import { CashDeltaBadge } from './CashDeltaBadge'
import { withDarkTheme } from '../../test/darkDecorator'

const meta: Meta<typeof CashDeltaBadge> = {
  title: 'Atoms/CashDeltaBadge',
  component: CashDeltaBadge,
  tags: ['autodocs'],
  args: { value: 300, size: 'md' },
}
export default meta
type Story = StoryObj<typeof CashDeltaBadge>

export const Positive: Story = {
  args: { value: 300 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByText(/\+300/)).toBeTruthy()
  },
}

export const Negative: Story = {
  args: { value: -24800 },
  play: async ({ canvasElement }) => {
    // MINUS U+2212 (jamais le trait d'union -).
    await expect(canvasElement.textContent).toContain('−')
    await expect(canvasElement.textContent).not.toContain('-24')
  },
}

export const Zero: Story = {
  args: { value: 0 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain('+0')
  },
}

export const Large: Story = { args: { value: 5380, size: 'lg' } }

export const Cancelled: Story = {
  args: { value: -18, cancelled: true },
  play: async ({ canvasElement }) => {
    await expect((canvasElement.firstElementChild as HTMLElement).className).toContain(
      'line-through'
    )
  },
}

const Panel = () => (
  <div style={{ background: 'var(--bg)', padding: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
    <CashDeltaBadge value={300} />
    <CashDeltaBadge value={-24800} />
    <CashDeltaBadge value={0} />
    <CashDeltaBadge value={5380} size="lg" />
    <CashDeltaBadge value={-18} cancelled />
  </div>
)

/** Tous les états — thème clair. */
export const AllStates: Story = { render: () => <Panel /> }

/** Tous les états — thème sombre (data-positive/negative basculent via les tokens). */
export const AllStatesDark: Story = {
  decorators: [withDarkTheme],
  render: () => <Panel />,
}
